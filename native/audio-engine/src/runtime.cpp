#include <waveform/engine/runtime.hpp>

#include <atomic>
#include <future>
#include <stdexcept>
#include <thread>

#include <juce_events/juce_events.h>

#if JUCE_MAC
#include <pthread.h>
#endif

namespace waveform::engine {

namespace {

std::atomic<bool> runtimeExists{false};

} // namespace

#if JUCE_LINUX || JUCE_BSD

// The host's GTK main loop does not service JUCE's message queue, so JUCE gets
// a message thread of its own.
struct Runtime::Impl {
    Impl() {
        std::promise<void> started;
        auto startedFuture = started.get_future();
        messageThread = std::thread([&started] {
            juce::initialiseJuce_GUI();
            started.set_value();
            juce::MessageManager::getInstance()->runDispatchLoop();
            juce::shutdownJuce_GUI();
        });
        startedFuture.wait();
    }

    ~Impl() {
        juce::MessageManager::getInstanceWithoutCreating()->stopDispatchLoop();
        messageThread.join();
    }

    Impl(const Impl&) = delete;
    Impl& operator=(const Impl&) = delete;
    Impl(Impl&&) = delete;
    Impl& operator=(Impl&&) = delete;

    std::thread messageThread;
};

#else

// JUCE posts to the main thread's native queue (the main CFRunLoop on macOS, a
// hidden message window on Windows), which the host's event loop services.
struct Runtime::Impl {
    Impl() {
#if JUCE_MAC
        // Messages are delivered on the main run loop whichever thread starts
        // JUCE, so starting anywhere else would leave JUCE confused about which
        // thread is its message thread.
        if (pthread_main_np() == 0) {
            throw std::logic_error("The engine runtime must be started on the main thread");
        }
#endif
        juce::initialiseJuce_GUI();
    }

    ~Impl() { juce::shutdownJuce_GUI(); }

    Impl(const Impl&) = delete;
    Impl& operator=(const Impl&) = delete;
    Impl(Impl&&) = delete;
    Impl& operator=(Impl&&) = delete;
};

#endif

Runtime::Runtime() {
    if (runtimeExists.exchange(true)) {
        throw std::logic_error("The engine runtime is already running");
    }
    try {
        impl_ = std::make_unique<Impl>();
    } catch (...) {
        runtimeExists = false;
        throw;
    }
}

Runtime::~Runtime() {
    impl_.reset();
    runtimeExists = false;
}

std::optional<std::chrono::microseconds>
Runtime::pingMessageThread(std::chrono::milliseconds timeout) const {
    if (juce::MessageManager::getInstanceWithoutCreating()->isThisTheMessageThread()) {
        throw std::logic_error("pingMessageThread cannot wait for the thread it is running on");
    }

    // Shared so the message can still run safely after a timeout.
    auto delivered = std::make_shared<std::promise<void>>();
    auto deliveredFuture = delivered->get_future();
    const auto start = std::chrono::steady_clock::now();

    if (!juce::MessageManager::callAsync([delivered] { delivered->set_value(); })) {
        return std::nullopt;
    }
    if (deliveredFuture.wait_for(timeout) != std::future_status::ready) {
        return std::nullopt;
    }
    return std::chrono::duration_cast<std::chrono::microseconds>(std::chrono::steady_clock::now() -
                                                                 start);
}

} // namespace waveform::engine
