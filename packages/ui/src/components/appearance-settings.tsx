"use client"

import { cn } from "cn"
import { useId } from "react"
import type { Selection } from "react-aria-components"

import {
  useDensity,
  useMotion,
  useTheme,
} from "@waveform/ui/components/preferences-provider"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@waveform/ui/components/toggle-group"
import {
  densityPreferences,
  motionPreferences,
  themePreferences,
  type DensityPreference,
  type MotionPreference,
  type ThemePreference,
} from "@waveform/ui/lib/preferences"

const themeLabels: Record<ThemePreference, string> = {
  system: "System",
  light: "Light",
  dark: "Dark",
}

const densityLabels: Record<DensityPreference, string> = {
  auto: "Automatic",
  compact: "Compact",
  comfortable: "Comfortable",
  touch: "Touch",
}

const motionLabels: Record<MotionPreference, string> = {
  system: "System",
  full: "Full",
  reduced: "Reduced",
}

interface ChoiceProps<T extends string> {
  label: string
  options: readonly T[]
  labels: Record<T, string>
  value: T
  onChange: (value: T) => void
  description: string
}

function Choice<T extends string>({
  label,
  options,
  labels,
  value,
  onChange,
  description,
}: ChoiceProps<T>) {
  const labelId = useId()
  const descriptionId = useId()
  const select = (keys: Selection) => {
    const next =
      keys === "all" ? undefined : options.find((option) => keys.has(option))
    if (next !== undefined) onChange(next)
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span id={labelId} className="faceplate text-muted-foreground">
        {label}
      </span>
      <ToggleGroup
        aria-labelledby={labelId}
        aria-describedby={descriptionId}
        selectionMode="single"
        disallowEmptySelection
        selectedKeys={[value]}
        onSelectionChange={select}
        variant="outline"
        spacing={0}
      >
        {options.map((option) => (
          <ToggleGroupItem key={option} id={option}>
            {labels[option]}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <p id={descriptionId} className="text-caption text-muted-foreground">
        {description}
      </p>
    </div>
  )
}

/** Theme, density and motion choices. Needs `PreferencesProvider` above it. */
function AppearanceSettings({ className }: { className?: string }) {
  const theme = useTheme()
  const density = useDensity()
  const motion = useMotion()

  return (
    <div className={cn("flex flex-col gap-5", className)}>
      <Choice
        label="Theme"
        options={themePreferences}
        labels={themeLabels}
        value={theme.preference}
        onChange={theme.setPreference}
        description={
          theme.preference === "system"
            ? `Follows the system, which is ${theme.theme} now.`
            : `Always ${theme.theme}.`
        }
      />
      <Choice
        label="Density"
        options={densityPreferences}
        labels={densityLabels}
        value={density.preference}
        onChange={density.setPreference}
        description={
          density.preference === "auto"
            ? `Touch with a touchscreen, comfortable otherwise. Now ${density.density}.`
            : "Sets the size of controls and text."
        }
      />
      <Choice
        label="Motion"
        options={motionPreferences}
        labels={motionLabels}
        value={motion.preference}
        onChange={motion.setPreference}
        description={
          motion.preference === "system"
            ? `Follows the system, which ${motion.reducedMotion ? "asks for reduced motion" : "allows motion"}.`
            : motion.reducedMotion
              ? "Animations and transitions are off."
              : "Animations and transitions are on."
        }
      />
    </div>
  )
}

export { AppearanceSettings }
