import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import type { EngineInfo, MessageLoopStatus } from "@/bindings"

import { AboutView } from "./about-view"

function engineInfo(messageLoop: MessageLoopStatus): EngineInfo {
  return {
    appVersion: "0.1.0",
    engineVersion: "0.1.0",
    juceVersion: "9.0.3",
    compiler: "AppleClang 17.0.0",
    buildType: "Debug",
    operatingSystem: "macOS 26.0",
    architecture: "aarch64",
    tauriVersion: "2.12.1",
    webviewVersion: null,
    messageLoop,
  }
}

function neverSettles(): Promise<EngineInfo> {
  return new Promise(() => undefined)
}

const responding: MessageLoopStatus = {
  state: "responding",
  roundTripMicros: 420,
}

// Text matchers below use plain spaces: Testing Library turns the no-break
// spaces in rendered units into plain spaces before comparing.

describe("AboutView", () => {
  it("says plainly that DJ features are not built yet", () => {
    render(<AboutView loadEngineInfo={neverSettles} />)
    expect(screen.getByText(/DJ features are not built yet/)).toBeVisible()
    expect(screen.getByText("Checking the audio engine…")).toBeVisible()
  })

  it("shows the versions the engine reports", async () => {
    render(
      <AboutView
        loadEngineInfo={() => Promise.resolve(engineInfo(responding))}
      />
    )
    expect(await screen.findByText("9.0.3")).toBeVisible()
    expect(screen.getByText("Responding, round trip 0.42 ms")).toBeVisible()
    expect(screen.getByText("macOS 26.0 (aarch64)")).toBeVisible()
    expect(screen.getByText("Unknown")).toBeVisible()
  })

  it.each<[MessageLoopStatus, string]>([
    [
      { state: "notResponding", timeoutMillis: 1000 },
      "Not responding: no answer within 1000 ms",
    ],
    [
      { state: "unavailable", reason: "The engine has stopped." },
      "Unavailable: The engine has stopped.",
    ],
  ])("describes a message loop that is %o", async (status, description) => {
    render(
      <AboutView loadEngineInfo={() => Promise.resolve(engineInfo(status))} />
    )
    expect(await screen.findByText(description)).toBeVisible()
  })

  it("reports a failure to reach the backend", async () => {
    render(
      <AboutView
        loadEngineInfo={() => Promise.reject(new Error("IPC refused"))}
      />
    )
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Could not get engine information: IPC refused"
    )
  })

  it("checks again on request", async () => {
    const user = userEvent.setup()
    const load = vi.fn(() => Promise.resolve(engineInfo(responding)))
    render(<AboutView loadEngineInfo={load} />)
    await screen.findByText("9.0.3")

    await user.click(screen.getByRole("button", { name: "Check again" }))
    await screen.findByText("9.0.3")
    expect(load).toHaveBeenCalledTimes(2)
  })

  it("copies a plain-text summary for bug reports", async () => {
    const user = userEvent.setup()
    render(
      <AboutView
        loadEngineInfo={() => Promise.resolve(engineInfo(responding))}
      />
    )
    await screen.findByText("9.0.3")

    await user.click(screen.getByRole("button", { name: "Copy details" }))
    expect(
      await screen.findByText("Copied the details to the clipboard.")
    ).toBeVisible()
    await expect(navigator.clipboard.readText()).resolves.toContain(
      "Engine 0.1.0 (JUCE 9.0.3, Debug, AppleClang 17.0.0)"
    )
  })
})
