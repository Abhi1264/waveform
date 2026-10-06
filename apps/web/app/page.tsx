import { WaveformMark } from "@waveform/ui/components/waveform-mark"
import Link from "next/link"

const progress = [
  {
    label: "Done",
    text: "A two-deck mix, a library, and effects run in the local app.",
  },
  {
    label: "Now",
    text: "The source is AGPL-3.0-only. Store binaries are still not built.",
  },
  {
    label: "Next",
    text: "Installers, after a bundle id and code signing exist. Still no account and no telemetry.",
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
            The source is free software under the GNU Affero General Public
            License, version 3 only. Personal use is allowed. The iOS App Store
            and the Mac App Store are not: Apple&apos;s terms conflict with the
            AGPL.
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
          aria-labelledby="philosophy-heading"
          className="flex flex-col gap-4"
        >
          <h2 id="philosophy-heading" className="text-lg font-medium">
            Philosophy
          </h2>
          <p className="text-pretty text-muted-foreground">
            The screen is the second instrument. It stays readable in the dark,
            works offline, and never asks for an account.
          </p>
        </section>

        <section
          aria-labelledby="features-heading"
          className="flex flex-col gap-4"
        >
          <h2 id="features-heading" className="text-lg font-medium">
            Features
          </h2>
          <p className="text-pretty text-muted-foreground">
            Two decks can load files, show a beat grid, and mix with cue, sync,
            EQ, loops, and hot cues. The library searches on this machine and
            keeps playlists, ratings, and tags in SQLite.
          </p>
        </section>

        <section
          aria-labelledby="platforms-heading"
          className="flex flex-col gap-4"
        >
          <h2 id="platforms-heading" className="text-lg font-medium">
            Platforms
          </h2>
          <p className="text-pretty text-muted-foreground">
            macOS is what we run by hand. Windows and Linux are in continuous
            integration. No iOS, Mac App Store, or Play Store binary is built.
            The AGPL conflicts with the iOS and Mac App Store terms.
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
            There is nothing to download yet. You can build the desktop app
            locally and mix with it; a public installer still waits on a bundle
            id and code signing. The{" "}
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
