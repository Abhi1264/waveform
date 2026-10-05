import { useId, type ComponentProps } from "react"

/**
 * The Waveform mark, drawn in `currentColor`. It is hidden from assistive
 * technology unless it has a `title`, which becomes its accessible name.
 */
function WaveformMark({
  title,
  ...props
}: Omit<ComponentProps<"svg">, "children"> & { title?: string }) {
  const clipId = useId()

  return (
    <svg
      data-slot="waveform-mark"
      viewBox="0 0 800 800"
      fill="currentColor"
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      {...props}
    >
      <clipPath id={clipId}>
        <circle cx="400" cy="400" r="400" />
      </clipPath>
      <g clipPath={`url(#${clipId})`}>
        <rect width="100" height="800" />
        <rect x="140" y="300" width="100" height="500" />
        <rect x="280" y="120" width="100" height="680" />
        <rect x="420" y="200" width="100" height="600" />
        <rect x="560" width="100" height="800" />
        <rect x="700" y="100" width="100" height="700" />
      </g>
    </svg>
  )
}

export { WaveformMark }
