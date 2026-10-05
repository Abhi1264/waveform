import { formatDecibels } from "@waveform/core-utils"
import { cn } from "cn"

interface LevelMeterProps {
  /** The level in dBFS. Negative infinity is silence. */
  level: number
  /** The highest recent level in dBFS, held as a lit segment. */
  peak?: number
  /** The accessible name, such as "Deck A level". */
  label: string
  /** The quietest level shown, in dBFS. */
  min?: number
  /** Levels from here up to full scale show as hot. */
  hotFrom?: number
  segments?: number
  orientation?: "vertical" | "horizontal"
  className?: string
}

type Zone = "safe" | "hot" | "clip"

const zoneColors: Record<Zone, string> = {
  safe: "bg-level-safe",
  hot: "bg-level-hot",
  clip: "bg-level-clip",
}

/**
 * A segmented level meter. The top segment lights only when the level reaches
 * full scale (0 dBFS), that is, when the signal clips.
 */
function LevelMeter({
  level,
  peak,
  label,
  min = -48,
  hotFrom = -6,
  segments = 16,
  orientation = "vertical",
  className,
}: LevelMeterProps) {
  // Segment i lights at this level; the last one is reserved for clipping.
  const thresholds = Array.from({ length: segments }, (_, index) =>
    index === segments - 1 ? 0 : min + (index * -min) / (segments - 1)
  )
  const zoneOf = (index: number): Zone =>
    index === segments - 1
      ? "clip"
      : (thresholds[index] ?? min) >= hotFrom
        ? "hot"
        : "safe"
  const peakIndex =
    peak === undefined
      ? -1
      : thresholds.findLastIndex((threshold) => peak >= threshold)

  return (
    <div
      role="meter"
      aria-label={label}
      aria-valuemin={min}
      aria-valuemax={0}
      aria-valuenow={Math.min(0, Math.max(min, level))}
      aria-valuetext={formatDecibels(level)}
      data-slot="level-meter"
      data-orientation={orientation}
      className={cn(
        "flex gap-px",
        orientation === "vertical"
          ? "h-fader w-2 flex-col-reverse"
          : "h-2 w-fader flex-row",
        className
      )}
    >
      {thresholds.map((threshold, index) => {
        const lit = level >= threshold || index === peakIndex
        return (
          <span
            key={threshold}
            data-lit={lit || undefined}
            data-zone={zoneOf(index)}
            className={cn(
              "flex-1 rounded-[1px]",
              lit ? zoneColors[zoneOf(index)] : "bg-control"
            )}
          />
        )
      })}
    </div>
  )
}

export { LevelMeter, type LevelMeterProps }
