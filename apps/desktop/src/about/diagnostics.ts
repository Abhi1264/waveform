import { formatMilliseconds } from "@waveform/core-utils"

import type { EngineInfo, MessageLoopStatus } from "@/bindings"

export function describeMessageLoop(status: MessageLoopStatus): string {
  switch (status.state) {
    case "responding":
      return `Responding, round trip ${formatMilliseconds(status.roundTripMicros / 1000)}`
    case "notResponding":
      return `Not responding: no answer within ${formatMilliseconds(status.timeoutMillis, 0)}`
    case "unavailable":
      return `Unavailable: ${status.reason}`
  }
}

/** Plain-text summary for bug reports. */
export function formatDiagnostics(info: EngineInfo): string {
  return [
    `Waveform ${info.appVersion}`,
    `Engine ${info.engineVersion} (JUCE ${info.juceVersion}, ${info.buildType}, ${info.compiler})`,
    `${info.operatingSystem} (${info.architecture})`,
    `Tauri ${info.tauriVersion}, web view ${info.webviewVersion ?? "unknown"}`,
    `JUCE message loop: ${describeMessageLoop(info.messageLoop)}`,
  ].join("\n")
}
