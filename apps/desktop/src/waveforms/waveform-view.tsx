import { useEffect, useRef } from "react"

import { drawPeaks } from "./peaks"

interface WaveformViewProps {
  peaks: ArrayLike<number>
  /** Seconds already played. */
  positionSeconds: number
  /** Seconds represented by the peaks. */
  durationSeconds: number
  color: string
}

function WaveformView({
  peaks,
  positionSeconds,
  durationSeconds,
  color,
}: WaveformViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const positionRef = useRef(positionSeconds)

  useEffect(() => {
    positionRef.current = positionSeconds
  }, [positionSeconds])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return undefined
    const context = canvas.getContext("2d")
    if (!context) return undefined
    let frame = 0
    const draw = () => {
      const duration = durationSeconds > 0 ? durationSeconds : 1
      const playhead = Math.min(1, Math.max(0, positionRef.current / duration))
      drawPeaks(context, peaks, playhead, color)
      frame = requestAnimationFrame(draw)
    }
    frame = requestAnimationFrame(draw)
    return () => {
      cancelAnimationFrame(frame)
    }
  }, [peaks, durationSeconds, color])

  return (
    <canvas
      ref={canvasRef}
      width={640}
      height={72}
      aria-label="Waveform"
      className="w-full rounded-md bg-sunken"
    />
  )
}

export { WaveformView }
