#include <waveform/engine/prepared_audio.hpp>

#include <algorithm>
#include <chrono>
#include <cstring>
#include <thread>

#include <juce_audio_formats/juce_audio_formats.h>

#include <waveform/dsp/analysis.hpp>

namespace waveform::engine {

namespace {

constexpr int kPeakWindow = 256;

} // namespace

PreparedAudio::PreparedAudio() {
    for (auto& chunk : chunks_) {
        chunk.samples.assign(static_cast<std::size_t>(kChunkFrames) * 2, 0.0f);
    }
}

PreparedAudio::~PreparedAudio() {
    stopLoader();
}

void PreparedAudio::stopLoader() {
    stop_.store(true, std::memory_order_release);
    if (loader_.joinable()) {
        loader_.join();
    }
    stop_.store(false, std::memory_order_relaxed);
}

std::string PreparedAudio::load(const std::string& path) {
    stopLoader();
    active_.store(false, std::memory_order_release);
    for (auto& chunk : chunks_) {
        chunk.readyFor.store(-1, std::memory_order_relaxed);
    }
    position_.store(0.0, std::memory_order_relaxed);
    peaks_.clear();
    beats_.clear();
    key_.clear();
    bpm_ = 0.0f;

    juce::AudioFormatManager local;
    local.registerBasicFormats();
    std::unique_ptr<juce::AudioFormatReader> reader(local.createReaderFor(juce::File(path)));
    if (reader == nullptr) {
        return "Could not read " + path + ".";
    }
    fileRate_ = reader->sampleRate;
    fileLength_ = static_cast<std::int64_t>(reader->lengthInSamples);
    path_ = path;

    const auto windows = static_cast<std::size_t>((fileLength_ + kPeakWindow - 1) / kPeakWindow);
    peaks_.assign(windows * 2, 0.0f);
    const auto analyseFrames = static_cast<std::size_t>(
        std::min<std::int64_t>(fileLength_, static_cast<std::int64_t>(fileRate_ * 8.0)));
    std::vector<float> mono(analyseFrames);
    std::size_t monoCount = 0;
    std::vector<float> left(static_cast<std::size_t>(kPeakWindow));
    std::vector<float> right(static_cast<std::size_t>(kPeakWindow));
    for (std::int64_t start = 0; start < fileLength_; start += kPeakWindow) {
        const int count =
            static_cast<int>(std::min<std::int64_t>(kPeakWindow, fileLength_ - start));
        float* channels[2] = {left.data(), right.data()};
        reader->read(channels, 2, start, count);
        float minimum = 0.0f;
        float maximum = 0.0f;
        for (int index = 0; index < count; ++index) {
            const float sample =
                (left[static_cast<std::size_t>(index)] + right[static_cast<std::size_t>(index)]) *
                0.5f;
            minimum = std::min(minimum, sample);
            maximum = std::max(maximum, sample);
        }
        const auto window = static_cast<std::size_t>(start / kPeakWindow);
        peaks_[window * 2] = minimum;
        peaks_[window * 2 + 1] = maximum;
        for (int index = 0; index < count && monoCount < mono.size(); ++index) {
            mono[monoCount] =
                (left[static_cast<std::size_t>(index)] + right[static_cast<std::size_t>(index)]) *
                0.5f;
            ++monoCount;
        }
    }
    const auto analysis = dsp::analyse(mono.data(), static_cast<int>(monoCount), fileRate_);
    bpm_ = analysis.bpm;
    key_ = analysis.key;
    beats_ = analysis.beats;

    active_.store(true, std::memory_order_release);
    loader_ = std::thread([this] { loaderMain(); });
    return {};
}

void PreparedAudio::loaderMain() {
    juce::AudioFormatManager local;
    local.registerBasicFormats();
    std::unique_ptr<juce::AudioFormatReader> reader(local.createReaderFor(juce::File(path_)));
    if (reader == nullptr) {
        return;
    }

    std::vector<float> left(static_cast<std::size_t>(kChunkFrames));
    std::vector<float> right(static_cast<std::size_t>(kChunkFrames));
    while (!stop_.load(std::memory_order_acquire)) {
        const auto playhead = static_cast<std::int64_t>(position_.load(std::memory_order_acquire));
        const auto origin = std::max<std::int64_t>(0, (playhead / kChunkFrames) * kChunkFrames);
        for (int ahead = 0; ahead < 4; ++ahead) {
            const auto start = origin + static_cast<std::int64_t>(ahead) * kChunkFrames;
            if (start >= fileLength_) {
                continue;
            }
            const int slot = static_cast<int>((start / kChunkFrames) % kChunkCount);
            auto& chunk = chunks_[slot];
            if (chunk.readyFor.load(std::memory_order_acquire) == start) {
                continue;
            }
            // Do not recycle the chunk the playhead is inside.
            if (ahead == 0 && chunk.readyFor.load(std::memory_order_acquire) == start) {
                continue;
            }
            const int count =
                static_cast<int>(std::min<std::int64_t>(kChunkFrames, fileLength_ - start));
            float* channels[2] = {left.data(), right.data()};
            reader->read(channels, 2, start, count);
            if (ahead != 0) {
                chunk.readyFor.store(-1, std::memory_order_release);
            }
            for (int frame = 0; frame < kChunkFrames; ++frame) {
                const bool inside = frame < count;
                chunk.samples[static_cast<std::size_t>(frame) * 2] =
                    inside ? left[static_cast<std::size_t>(frame)] : 0.0f;
                chunk.samples[static_cast<std::size_t>(frame) * 2 + 1] =
                    inside ? right[static_cast<std::size_t>(frame)] : 0.0f;
            }
            chunk.readyFor.store(start, std::memory_order_release);
        }
        std::this_thread::sleep_for(std::chrono::milliseconds(2));
    }
}

void PreparedAudio::render(float* interleavedStereo, int frames, float pitch) noexcept {
    if (interleavedStereo == nullptr || frames <= 0) {
        return;
    }
    if (!active_.load(std::memory_order_acquire)) {
        std::fill_n(interleavedStereo, static_cast<std::size_t>(frames) * 2, 0.0f);
        return;
    }
    double cursor = position_.load(std::memory_order_relaxed);
    const float step = pitch > 0.0f ? pitch : 1.0f;
    for (int frame = 0; frame < frames; ++frame) {
        const auto index = static_cast<std::int64_t>(cursor);
        const auto start = (index / kChunkFrames) * kChunkFrames;
        const int slot = static_cast<int>((start / kChunkFrames) % kChunkCount);
        const auto ready = chunks_[slot].readyFor.load(std::memory_order_acquire);
        float left = 0.0f;
        float right = 0.0f;
        if (ready == start && index >= 0 && index < fileLength_) {
            const int offset = static_cast<int>(index - start);
            left = chunks_[slot].samples[static_cast<std::size_t>(offset) * 2];
            right = chunks_[slot].samples[static_cast<std::size_t>(offset) * 2 + 1];
        }
        interleavedStereo[static_cast<std::size_t>(frame) * 2] = left;
        interleavedStereo[static_cast<std::size_t>(frame) * 2 + 1] = right;
        cursor += static_cast<double>(step);
        if (cursor >= static_cast<double>(fileLength_)) {
            cursor = 0.0;
        }
    }
    position_.store(cursor, std::memory_order_release);
}

void PreparedAudio::seek(double positionSamples) noexcept {
    position_.store(std::max(0.0, positionSamples), std::memory_order_release);
}

void PreparedAudio::reset() noexcept {
    seek(0.0);
}

double PreparedAudio::positionSamples() const noexcept {
    return position_.load(std::memory_order_acquire);
}

bool PreparedAudio::ready() const noexcept {
    return active_.load(std::memory_order_acquire);
}

std::vector<float> PreparedAudio::peaks() const {
    return peaks_;
}

double PreparedAudio::durationSeconds() const noexcept {
    if (fileRate_ <= 0.0) {
        return 0.0;
    }
    return static_cast<double>(fileLength_) / fileRate_;
}

} // namespace waveform::engine
