"use client"

import { cn } from "cn"
import { useRef } from "react"
import {
  mergeProps,
  useFocusRing,
  useNumberFormatter,
  useSlider,
  useSliderThumb,
  VisuallyHidden,
} from "react-aria"
import { useSliderState, type SliderProps } from "react-stately"

/** Where the arc starts and how far it sweeps, in degrees clockwise from 12 o'clock. */
const START_ANGLE = -135
const SWEEP = 270

interface KnobProps extends Omit<SliderProps<number>, "orientation" | "label"> {
  /** The short faceplate label, such as "Gain" or "Low". */
  label: string
  /** The value as people read it, for example "−3.5 dB". Also announced by screen readers. */
  formatValue?: (value: number) => string
  /** Where a double-click returns the knob. Defaults to `defaultValue`, then the minimum. */
  resetValue?: number
  /** Pixels of vertical drag that sweep the whole range. */
  travel?: number
  className?: string
}

function polar(angle: number, radius: number): [number, number] {
  const radians = ((angle - 90) * Math.PI) / 180
  return [24 + radius * Math.cos(radians), 24 + radius * Math.sin(radians)]
}

function arc(fromAngle: number, toAngle: number, radius: number): string {
  const [startAngle, endAngle] =
    fromAngle <= toAngle ? [fromAngle, toAngle] : [toAngle, fromAngle]
  const [x1, y1] = polar(startAngle, radius)
  const [x2, y2] = polar(endAngle, radius)
  const largeArc = endAngle - startAngle > 180 ? 1 : 0
  return `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`
}

/**
 * A rotary control. Dragging up or down anywhere on it changes the value
 * relative to where the drag started, so pressing it never makes it jump.
 * Ranges that cross zero, such as EQ, draw the value arc from the centre.
 */
function Knob({
  label,
  formatValue,
  resetValue,
  travel = 160,
  className,
  ...props
}: KnobProps) {
  const travelRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const numberFormatter = useNumberFormatter()
  const sliderProps = { ...props, label, orientation: "vertical" as const }
  const state = useSliderState({ ...sliderProps, numberFormatter })
  const { groupProps, labelProps, outputProps } = useSlider(
    sliderProps,
    state,
    travelRef
  )
  const { thumbProps, inputProps, isDragging } = useSliderThumb(
    { index: 0, trackRef: travelRef, inputRef, orientation: "vertical" },
    state
  )
  const { focusProps, isFocusVisible } = useFocusRing()

  const value = state.getThumbValue(0)
  const minValue = state.getThumbMinValue(0)
  const maxValue = state.getThumbMaxValue(0)
  const valueText = formatValue?.(value) ?? state.getThumbValueLabel(0)
  const angleOf = (percent: number) => START_ANGLE + percent * SWEEP
  const originPercent =
    minValue < 0 && maxValue > 0 ? -minValue / (maxValue - minValue) : 0
  const valueAngle = angleOf(state.getThumbPercent(0))
  const [pointerX, pointerY] = polar(valueAngle, 13)

  const reset = () => {
    state.setThumbValue(0, resetValue ?? props.defaultValue ?? minValue)
  }

  return (
    <div
      {...groupProps}
      data-slot="knob"
      className={cn(
        "relative inline-flex w-fit flex-col items-center gap-1",
        className
      )}
    >
      <label {...labelProps} className="faceplate text-muted-foreground">
        {label}
      </label>
      {/* Measures drag distance only; clipped so it never affects layout or scrolling. */}
      <div aria-hidden className="absolute size-0 overflow-hidden">
        <div ref={travelRef} style={{ width: travel, height: travel }} />
      </div>
      <div
        {...mergeProps(thumbProps, { onDoubleClick: reset })}
        data-slot="knob-face"
        data-dragging={isDragging || undefined}
        data-focus-visible={isFocusVisible || undefined}
        style={{ touchAction: "none" }}
        className="relative size-knob cursor-ns-resize rounded-full outline-offset-2 outline-focus data-focus-visible:outline-2"
      >
        <svg viewBox="0 0 48 48" aria-hidden className="size-full">
          <circle
            cx="24"
            cy="24"
            r="16"
            className="fill-control stroke-control-border"
            strokeWidth="1"
          />
          <path
            d={arc(angleOf(0), angleOf(1), 21)}
            className="fill-none stroke-control"
            strokeWidth="3"
            strokeLinecap="round"
          />
          {valueAngle !== angleOf(originPercent) && (
            <path
              d={arc(angleOf(originPercent), valueAngle, 21)}
              className="fill-none stroke-(--deck-color,var(--wf-color-text))"
              strokeWidth="3"
              strokeLinecap="round"
            />
          )}
          <line
            x1="24"
            y1="24"
            x2={pointerX}
            y2={pointerY}
            className="stroke-foreground"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </svg>
        <VisuallyHidden>
          <input
            ref={inputRef}
            {...mergeProps(inputProps, focusProps)}
            aria-valuetext={valueText}
          />
        </VisuallyHidden>
      </div>
      <output {...outputProps} className="readout text-readout-sm">
        {valueText}
      </output>
    </div>
  )
}

export { Knob, type KnobProps }
