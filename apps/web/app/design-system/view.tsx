"use client"

import { AppearanceSettings } from "@waveform/ui/components/appearance-settings"
import { Separator } from "@waveform/ui/components/separator"
import { WaveformMark } from "@waveform/ui/components/waveform-mark"
import Link from "next/link"

import { ColorPanel } from "./color-panel"
import { DensityPanel } from "./density-panel"
import { MotionPanel } from "./motion-panel"
import { StatesPanel } from "./states-panel"
import { DeckHeaderSpecimen, TransportSpecimen } from "./specimens"
import { TypePanel } from "./type-panel"

const sections = [
  { href: "#colour", label: "Colour" },
  { href: "#type", label: "Type" },
  { href: "#density", label: "Density" },
  { href: "#states", label: "States" },
  { href: "#motion", label: "Motion" },
  { href: "#deck-header", label: "Specimens" },
] as const

function DesignSystemView() {
  return (
    <div className="min-h-svh touch-manipulation bg-canvas text-foreground">
      <header className="sticky top-0 z-10 border-b border-divider bg-canvas/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-3 px-[max(1.5rem,env(safe-area-inset-left))] py-3 pr-[max(1.5rem,env(safe-area-inset-right))]">
          <a
            href="#content"
            className="faceplate text-muted-foreground outline-offset-2 outline-focus hover:text-foreground focus-visible:outline-2"
            onClick={(event) => {
              event.preventDefault()
              document.getElementById("content")?.focus()
            }}
          >
            Skip to content
          </a>
          <Link
            href="/"
            className="flex items-center gap-2 rounded-sm outline-offset-2 outline-focus focus-visible:outline-2"
          >
            <WaveformMark className="size-6" />
            <span className="text-title" translate="no">
              Waveform
            </span>
          </Link>
          <p className="faceplate text-muted-foreground">Design system</p>
          <nav aria-label="On this page" className="ms-auto">
            <ul className="flex flex-wrap items-center gap-x-4 gap-y-1">
              {sections.map((section) => (
                <li key={section.href}>
                  <a
                    href={section.href}
                    className="faceplate text-muted-foreground outline-offset-2 outline-focus hover:text-foreground focus-visible:outline-2"
                  >
                    {section.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </header>

      <main
        id="content"
        tabIndex={-1}
        className="mx-auto flex max-w-6xl flex-col gap-16 px-[max(1.5rem,env(safe-area-inset-left))] py-10 pr-[max(1.5rem,env(safe-area-inset-right))] pb-[max(2.5rem,env(safe-area-inset-bottom))] outline-none focus:outline-2 focus:outline-offset-4 focus:outline-focus"
      >
        <section
          aria-labelledby="intro-heading"
          className="flex max-w-3xl flex-col gap-4"
        >
          <h1 id="intro-heading" className="text-display text-pretty">
            The screen is the second instrument.
          </h1>
          <p className="text-pretty text-muted-foreground">
            A DJ glances at it between the controller and the crowd. Chrome
            stays monochrome, like the mark. Colour appears only when it names a
            frequency, a deck, a cue, a level or a warning. These tokens and
            controls are what later phases build the booth from. Nothing here
            plays audio.
          </p>
        </section>

        <section
          aria-labelledby="appearance-heading"
          className="flex max-w-3xl flex-col gap-4 rounded-lg border border-divider bg-surface p-5"
        >
          <h2 id="appearance-heading" className="text-title">
            Appearance
          </h2>
          <AppearanceSettings />
        </section>

        <ColorPanel />
        <Separator />
        <TypePanel />
        <Separator />
        <DensityPanel />
        <Separator />
        <StatesPanel />
        <Separator />
        <MotionPanel />
        <Separator />
        <DeckHeaderSpecimen />
        <TransportSpecimen />
      </main>
    </div>
  )
}

export { DesignSystemView }
