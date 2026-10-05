import { WaveformMark } from "@waveform/ui/components/waveform-mark"
import Link from "next/link"

const progress = [
  {
    label: "Done",
    text: "Phases 0–2: the architecture, the monorepo and native engine skeleton, and the design system.",
  },
  {
    label: "Now",
    text: "Phase 3, the audio engine foundation: audio devices, playback, and the mixer.",
  },
  {
    label: "Next",
    text: "Phase 4, the media pipeline: import, analysis, and the library database.",
  },
] as const

export default function Page() {
  return (
    <div className="mx-auto flex min-h-svh max-w-2xl flex-col gap-12 px-6 py-12 sm:py-20">
      <header className="flex items-center gap-3">
        <WaveformMark className="size-8" />
        <span className="text-lg font-semibold tracking-tight">Waveform</span>
      </header>

      <main className="flex flex-col gap-12">
        <section className="flex flex-col gap-4">
          <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            A DJ workstation, in early development.
          </h1>
          <p className="text-pretty text-muted-foreground">
            Waveform is a DJ workstation for macOS, Windows, Linux, iPad, and
            Android, built around a native real-time audio engine. It is meant
            to work fully offline, with no account, subscription, or telemetry.
            It will be released as open source; the license has not been chosen
            yet.
          </p>
        </section>

        <section
          aria-labelledby="progress-heading"
          className="flex flex-col gap-4"
        >
          <h2 id="progress-heading" className="text-lg font-medium">
            Where it stands
          </h2>
          <dl className="flex flex-col gap-3">
            {progress.map(({ label, text }) => (
              <div key={label} className="grid grid-cols-[4rem_1fr] gap-4">
                <dt className="font-medium">{label}</dt>
                <dd className="text-pretty text-muted-foreground">{text}</dd>
              </div>
            ))}
          </dl>
          <p className="text-pretty text-muted-foreground">
            The first version you can mix with is Phase 5: two decks, cue, sync,
            EQ, and looping.
          </p>
        </section>

        <section
          aria-labelledby="today-heading"
          className="flex flex-col gap-4"
        >
          <h2 id="today-heading" className="text-lg font-medium">
            What works today
          </h2>
          <p className="text-pretty text-muted-foreground">
            There is nothing to download yet. The desktop app starts its audio
            engine and reports what it finds; decks, the music library, and
            audio output come in later phases. The{" "}
            <Link
              href="/design-system"
              className="underline underline-offset-4 outline-offset-2 outline-focus hover:text-foreground focus-visible:outline-2"
            >
              design system
            </Link>{" "}
            shows the tokens and controls later phases will build with.
          </p>
        </section>
      </main>

      <footer className="mt-auto text-sm text-muted-foreground">
        This page uses no cookies, analytics, or third-party resources.
      </footer>
    </div>
  )
}
