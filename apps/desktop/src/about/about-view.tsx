import { useEffect, useState, type ReactNode } from "react"

import { Button } from "@waveform/ui/components/button"
import { WaveformMark } from "@waveform/ui/components/waveform-mark"

import type { EngineInfo } from "@/bindings"

import { describeMessageLoop, formatDiagnostics } from "./diagnostics"

type LoadState =
  | { kind: "checking" }
  | { kind: "loaded"; info: EngineInfo }
  | { kind: "failed"; message: string }

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function useEngineInfo(loadEngineInfo: () => Promise<EngineInfo>) {
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState<LoadState>({ kind: "checking" })

  useEffect(() => {
    let current = true
    loadEngineInfo().then(
      (info) => {
        if (current) setState({ kind: "loaded", info })
      },
      (error: unknown) => {
        if (current) setState({ kind: "failed", message: describeError(error) })
      }
    )
    return () => {
      current = false
    }
  }, [loadEngineInfo, attempt])

  const checkAgain = () => {
    setState({ kind: "checking" })
    setAttempt((count) => count + 1)
  }

  return { state, checkAgain }
}

function Detail({ term, children }: { term: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[10rem_1fr] items-baseline gap-4 py-2">
      <dt className="faceplate text-muted-foreground">{term}</dt>
      <dd className="readout text-readout-sm wrap-break-word">{children}</dd>
    </div>
  )
}

export function AboutView({
  loadEngineInfo,
}: {
  loadEngineInfo: () => Promise<EngineInfo>
}) {
  const { state, checkAgain } = useEngineInfo(loadEngineInfo)
  const [copyResult, setCopyResult] = useState("")

  const copyDetails = (info: EngineInfo) => {
    navigator.clipboard.writeText(formatDiagnostics(info)).then(
      () => {
        setCopyResult("Copied the details to the clipboard.")
      },
      () => {
        setCopyResult("Could not copy: the system clipboard refused access.")
      }
    )
  }

  return (
    <>
      <header className="flex items-center gap-4">
        <WaveformMark className="size-10" />
        <div>
          <h1 className="text-heading">Waveform</h1>
          <p className="text-caption text-muted-foreground">
            {state.kind === "loaded" ? (
              <>
                Version <span className="readout">{state.info.appVersion}</span>
              </>
            ) : (
              "DJ workstation"
            )}
          </p>
        </div>
      </header>

      <section
        aria-labelledby="development-heading"
        className="rounded-lg border border-divider bg-surface p-4"
      >
        <h2 id="development-heading" className="text-title">
          Early development
        </h2>
        <p className="mt-1 text-muted-foreground">
          DJ features are not built yet: there are no decks, no library, and no
          audio output. This build only checks that the app and its audio engine
          start and talk to each other.
        </p>
      </section>

      <section aria-labelledby="engine-heading" className="flex flex-col gap-4">
        <h2 id="engine-heading" className="text-title">
          Audio engine
        </h2>

        {state.kind === "checking" && (
          <p role="status" className="text-muted-foreground">
            Checking the audio engine…
          </p>
        )}

        {state.kind === "failed" && (
          <p role="alert" className="text-destructive">
            Could not get engine information: {state.message}
          </p>
        )}

        {state.kind === "loaded" && (
          <dl className="divide-y divide-divider">
            <Detail term="JUCE message loop">
              {describeMessageLoop(state.info.messageLoop)}
            </Detail>
            <Detail term="App">{state.info.appVersion}</Detail>
            <Detail term="Engine">{state.info.engineVersion}</Detail>
            <Detail term="JUCE">{state.info.juceVersion}</Detail>
            <Detail term="Build">
              {state.info.buildType}, {state.info.compiler}
            </Detail>
            <Detail term="Operating system">
              {state.info.operatingSystem} ({state.info.architecture})
            </Detail>
            <Detail term="Tauri">{state.info.tauriVersion}</Detail>
            <Detail term="Web view">
              {state.info.webviewVersion ?? "Unknown"}
            </Detail>
          </dl>
        )}

        <div className="flex gap-2">
          <Button
            variant="outline"
            isDisabled={state.kind === "checking"}
            onPress={checkAgain}
          >
            Check again
          </Button>
          <Button
            variant="outline"
            isDisabled={state.kind !== "loaded"}
            onPress={() => {
              if (state.kind === "loaded") copyDetails(state.info)
            }}
          >
            Copy details
          </Button>
        </div>
        <p role="status" className="text-caption text-muted-foreground">
          {copyResult}
        </p>
      </section>
    </>
  )
}
