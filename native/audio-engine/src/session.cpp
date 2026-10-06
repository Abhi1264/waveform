#include <waveform/engine/session.hpp>

#include <waveform/engine/command_queue.hpp>
#include <waveform/engine/mixer.hpp>

#include <condition_variable>
#include <cstring>
#include <mutex>
#include <type_traits>
#include <utility>

#include <juce_audio_basics/juce_audio_basics.h>
#include <juce_audio_devices/juce_audio_devices.h>
#include <juce_audio_formats/juce_audio_formats.h>
#include <juce_events/juce_events.h>

namespace waveform::engine {

namespace {

constexpr int kQueueCapacity = 256;
constexpr int kScratchFrames = 8192;

void copyName(char* destination, const std::string& name) noexcept {
    std::memset(destination, 0, 64);
    const auto count = std::min(name.size(), static_cast<std::size_t>(63));
    std::memcpy(destination, name.data(), count);
}

} // namespace

struct Session::Impl : private juce::AudioIODeviceCallback {
    Impl() { mixer.prepare(48000.0, kScratchFrames); }

    ~Impl() override { closeOnMessageThread(); }

    std::vector<OutputDevice> outputDevices() const {
        std::vector<OutputDevice> devices;
        runOnMessageThread([&] {
            auto& manager = deviceManager;
            for (auto* type : manager.getAvailableDeviceTypes()) {
                type->scanForDevices();
                for (const auto& name : type->getDeviceNames(false)) {
                    devices.push_back(OutputDevice{type->getTypeName().toStdString(),
                                                   name.toStdString()});
                }
            }
        });
        return devices;
    }

    std::string openDefaultOutput() {
        return runOnMessageThread([&] {
            closeDevice();
            const auto error = deviceManager.initialiseWithDefaultDevices(0, 2);
            if (error.isNotEmpty()) {
                return error.toStdString();
            }
            deviceManager.addAudioCallback(this);
            return std::string{};
        });
    }

    std::string openOutput(const std::string& name) {
        return runOnMessageThread([&] {
            closeDevice();
            const auto error = deviceManager.initialiseWithDefaultDevices(0, 2);
            if (error.isNotEmpty()) {
                return error.toStdString();
            }
            auto setup = deviceManager.getAudioDeviceSetup();
            setup.outputDeviceName = juce::String(name);
            const auto changed = deviceManager.setAudioDeviceSetup(setup, true);
            if (changed.isNotEmpty()) {
                closeDevice();
                return changed.toStdString();
            }
            deviceManager.addAudioCallback(this);
            return std::string{};
        });
    }

    void close() { runOnMessageThread([&] { closeDevice(); }); }

    void submit(Command command) {
        std::lock_guard lock(producer);
        if (!queue.push(command)) {
            dropped.fetch_add(1, std::memory_order_relaxed);
        }
    }

    EngineSnapshot snapshot() const { return publisher.read(); }

    void processOffline(float* interleavedStereo, int frames, double sampleRate) {
        if (sampleRate != mixer.sampleRate() || frames > mixer.maxFrames()) {
            mixer.prepare(sampleRate, std::max(frames, kScratchFrames));
        }
        std::vector<Command> commands;
        drain(commands);
        EngineSnapshot next = publisher.read();
        next.deviceOpen = 0;
        copyName(next.deviceName, "offline");
        mixer.process(commands.data(), static_cast<int>(commands.size()), interleavedStereo, frames,
                      next);
        next.droppedCommands = dropped.load(std::memory_order_relaxed);
        publisher.publish(next);
    }

    void simulateDeviceStopped() {
        deviceOpen.store(false, std::memory_order_relaxed);
        auto next = publisher.read();
        next.deviceOpen = 0;
        next.bufferSize = 0;
        publisher.publish(next);
    }

    void simulateDeviceStarted(double sampleRate, int bufferSize, const std::string& name) {
        mixer.prepare(sampleRate, std::max(bufferSize, kScratchFrames));
        deviceOpen.store(true, std::memory_order_relaxed);
        auto next = publisher.read();
        next.sampleRate = static_cast<std::uint32_t>(sampleRate);
        next.bufferSize = static_cast<std::uint32_t>(bufferSize);
        next.deviceOpen = 1;
        copyName(next.deviceName, name);
        publisher.publish(next);
    }

    void audioDeviceIOCallbackWithContext(const float* const* input, int numInputChannels,
                                          float* const* output, int numOutputChannels, int numSamples,
                                          const juce::AudioIODeviceCallbackContext& /*context*/) override {
        juce::ScopedNoDenormals flushDenormals;
        callbackCount.fetch_add(1, std::memory_order_relaxed);
        // A fixed array: the callback must not allocate. Anything that does not
        // fit is counted and discarded.
        Command local[64];
        int count = 0;
        Command command;
        while (queue.pop(command)) {
            if (count < 64) {
                local[count] = command;
                ++count;
            } else {
                dropped.fetch_add(1, std::memory_order_relaxed);
            }
        }

        const int frames = std::min(numSamples, mixer.maxFrames());
        if (frames < numSamples || block.size() < static_cast<std::size_t>(frames) * 2) {
            xruns.fetch_add(1, std::memory_order_relaxed);
        }

        const auto xrunsBefore = blockSnapshot.xrunCount;
        mixer.process(local, count, block.data(), frames, blockSnapshot);
        mixer.addInput(block.data(), input, numInputChannels, frames);
        if (blockSnapshot.xrunCount > xrunsBefore) {
            xruns.fetch_add(blockSnapshot.xrunCount - xrunsBefore, std::memory_order_relaxed);
        }
        blockSnapshot.callbackCount = callbackCount.load(std::memory_order_relaxed);
        blockSnapshot.xrunCount = xruns.load(std::memory_order_relaxed);
        blockSnapshot.droppedCommands = dropped.load(std::memory_order_relaxed);
        blockSnapshot.deviceOpen = deviceOpen.load(std::memory_order_relaxed) ? 1 : 0;
        blockSnapshot.bufferSize = static_cast<std::uint32_t>(numSamples);
        publisher.publish(blockSnapshot);

        for (int channel = 0; channel < numOutputChannels; ++channel) {
            if (output[channel] == nullptr) {
                continue;
            }
            const int sourceChannel = channel % 2;
            for (int frame = 0; frame < frames; ++frame) {
                output[channel][frame] = block[static_cast<std::size_t>(frame) * 2 +
                                               static_cast<std::size_t>(sourceChannel)];
            }
            if (frames < numSamples) {
                std::memset(output[channel] + frames, 0,
                            sizeof(float) * static_cast<std::size_t>(numSamples - frames));
            }
        }
    }

    void audioDeviceAboutToStart(juce::AudioIODevice* device) override {
        const double rate = device != nullptr ? device->getCurrentSampleRate() : 48000.0;
        const int buffer = device != nullptr ? device->getCurrentBufferSizeSamples() : 256;
        mixer.prepare(rate, std::max(buffer, kScratchFrames));
        block.assign(static_cast<std::size_t>(mixer.maxFrames()) * 2, 0.0f);
        deviceOpen.store(true, std::memory_order_relaxed);
        auto next = publisher.read();
        next.sampleRate = static_cast<std::uint32_t>(rate);
        next.bufferSize = static_cast<std::uint32_t>(std::max(buffer, 0));
        next.deviceOpen = 1;
        copyName(next.deviceName, device != nullptr ? device->getName().toStdString() : "output");
        std::memcpy(blockSnapshot.deviceName, next.deviceName, sizeof(next.deviceName));
        publisher.publish(next);
    }

    void audioDeviceStopped() override { simulateDeviceStopped(); }

    Mixer mixer;
    CommandQueue<Command, kQueueCapacity> queue;
    SnapshotPublisher publisher;
    EngineSnapshot blockSnapshot{};
    std::vector<float> block{static_cast<std::size_t>(kScratchFrames) * 2};
    mutable juce::AudioDeviceManager deviceManager;
    std::mutex producer;
    std::atomic<std::uint32_t> dropped{0};
    std::atomic<std::uint32_t> xruns{0};
    std::atomic<std::uint32_t> callbackCount{0};
    std::atomic<bool> deviceOpen{false};

private:
    void drain(std::vector<Command>& commands) {
        std::lock_guard lock(producer);
        Command command;
        while (queue.pop(command)) {
            commands.push_back(command);
        }
    }

    void closeDevice() {
        deviceManager.removeAudioCallback(this);
        deviceManager.closeAudioDevice();
        deviceOpen.store(false, std::memory_order_relaxed);
    }

    void closeOnMessageThread() {
        if (juce::MessageManager::getInstanceWithoutCreating() == nullptr) {
            closeDevice();
            return;
        }
        runOnMessageThread([&] { closeDevice(); });
    }

    template <typename Function>
    auto runOnMessageThread(Function&& function) const -> decltype(function()) {
        using Result = decltype(function());
        auto& messageManager = *juce::MessageManager::getInstance();
        if constexpr (std::is_void_v<Result>) {
            if (messageManager.isThisTheMessageThread()) {
                function();
                return;
            }
            std::mutex mutex;
            std::condition_variable done;
            bool finished = false;
            messageManager.callAsync([&] {
                function();
                std::lock_guard lock(mutex);
                finished = true;
                done.notify_one();
            });
            std::unique_lock lock(mutex);
            done.wait(lock, [&] { return finished; });
        } else {
            if (messageManager.isThisTheMessageThread()) {
                return function();
            }
            std::mutex mutex;
            std::condition_variable done;
            bool finished = false;
            Result result{};
            messageManager.callAsync([&] {
                result = function();
                std::lock_guard lock(mutex);
                finished = true;
                done.notify_one();
            });
            std::unique_lock lock(mutex);
            done.wait(lock, [&] { return finished; });
            return result;
        }
    }
};

Session::Session() : impl_(std::make_unique<Impl>()) {}

Session::~Session() = default;

std::vector<OutputDevice> Session::outputDevices() const { return impl_->outputDevices(); }

std::string Session::openDefaultOutput() { return impl_->openDefaultOutput(); }

std::string Session::openOutput(const std::string& name) { return impl_->openOutput(name); }

void Session::close() { impl_->close(); }

void Session::play(int deck) { impl_->submit(Command{CommandKind::Play, static_cast<std::uint8_t>(deck), 0}); }

void Session::pause(int deck) {
    impl_->submit(Command{CommandKind::Pause, static_cast<std::uint8_t>(deck), 0});
}

void Session::cue(int deck) { impl_->submit(Command{CommandKind::Cue, static_cast<std::uint8_t>(deck), 0}); }

void Session::setGainDb(int deck, float decibels) {
    impl_->submit(Command{CommandKind::SetGainDb, static_cast<std::uint8_t>(deck), decibels});
}

void Session::setCrossfader(float position) {
    impl_->submit(Command{CommandKind::SetCrossfader, 0, position});
}

void Session::setToneFrequency(int deck, float hertz) {
    impl_->submit(Command{CommandKind::SetToneFrequency, static_cast<std::uint8_t>(deck), hertz});
}

void Session::setNoise(int deck, bool noise) {
    impl_->submit(
        Command{CommandKind::SetNoise, static_cast<std::uint8_t>(deck), noise ? 1.0f : 0.0f});
}

void Session::command(std::uint8_t kind, int deck, float value, float value2, std::uint8_t slot) {
    Command message;
    message.kind = static_cast<CommandKind>(kind);
    message.deck = static_cast<std::uint8_t>(deck);
    message.value = value;
    message.value2 = value2;
    message.slot = slot;
    impl_->submit(message);
}

EngineSnapshot Session::snapshot() const { return impl_->snapshot(); }

std::string Session::loadFile(int deck, const std::string& path) {
    return impl_->mixer.loadFile(deck, path);
}

std::vector<float> Session::peaks(int deck) const { return impl_->mixer.peaks(deck); }

float Session::bpm(int deck) const { return impl_->mixer.bpm(deck); }

std::string Session::key(int deck) const { return impl_->mixer.key(deck); }

double Session::duration(int deck) const { return impl_->mixer.duration(deck); }

std::vector<float> Session::beats(int deck) const { return impl_->mixer.beats(deck); }

std::string Session::writeRecording(const std::string& path) {
    const int capacity = impl_->mixer.recordingCapacity();
    if (capacity < 4) {
        return "Nothing has been recorded yet.";
    }
    std::vector<float> samples(static_cast<std::size_t>(capacity));
    const int count = impl_->mixer.copyRecording(samples.data(), capacity);
    if (count < 4) {
        return "Nothing has been recorded yet.";
    }
    const int frames = count / 2;
    juce::File file{juce::String(path)};
    file.deleteFile();
    auto stream = std::make_unique<juce::FileOutputStream>(file);
    if (!stream->openedOk()) {
        return "Could not open the recording.";
    }
    std::unique_ptr<juce::OutputStream> output = std::move(stream);
    juce::WavAudioFormat wav;
    auto writer = wav.createWriterFor(output, juce::AudioFormatWriter::Options{}
                                                 .withSampleRate(impl_->mixer.sampleRate())
                                                 .withNumChannels(2)
                                                 .withBitsPerSample(16));
    if (writer == nullptr) {
        return "Could not write a wav file.";
    }
    juce::AudioBuffer<float> buffer(2, frames);
    for (int index = 0; index < frames; ++index) {
        buffer.setSample(0, index, samples[static_cast<std::size_t>(index) * 2]);
        buffer.setSample(1, index, samples[static_cast<std::size_t>(index) * 2 + 1]);
    }
    if (!writer->writeFromAudioSampleBuffer(buffer, 0, frames)) {
        return "The recording was not written.";
    }
    return {};
}

void Session::processOffline(float* interleavedStereo, int frames, double sampleRate) {
    impl_->processOffline(interleavedStereo, frames, sampleRate);
}

void Session::simulateDeviceStopped() { impl_->simulateDeviceStopped(); }

void Session::simulateDeviceStarted(double sampleRate, int bufferSize, const std::string& name) {
    impl_->simulateDeviceStarted(sampleRate, bufferSize, name);
}

} // namespace waveform::engine
