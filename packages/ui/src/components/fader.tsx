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

interface FaderProps extends Omit<SliderProps<number>, "label"> {
  /** The short faceplate label, such as "Volume". */
  label: string
  /** The value as people read it, for example "−6.0 dB". Also announced by screen readers. */
  formatValue?: (value: number) => string
  /** Where a double-click returns the cap. Defaults to `defaultValue`, then the minimum. */
  resetValue?: number
  className?: string
}

/**
 * A linear slider, vertical for channel volume or horizontal for the
 * crossfader. Only the cap moves it: clicking the track does nothing, so a
 * stray click cannot change the level.
 */
function Fader({
  label,
  formatValue,
  resetValue,
  orientation = "vertical",
  className,
  ...props
}: FaderProps) {
  const trackRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const numberFormatter = useNumberFormatter()
  const sliderProps = { ...props, label, orientation }
  const state = useSliderState({ ...sliderProps, numberFormatter })
  // The track's own props are left off on purpose: they would make a click jump the value.
  const { groupProps, labelProps, outputProps } = useSlider(
    sliderProps,
    state,
    trackRef
  )
  const { thumbProps, inputProps, isDragging } = useSliderThumb(
    { index: 0, trackRef, inputRef, orientation },
    state
  )
  const { focusProps, isFocusVisible } = useFocusRing()

  const isVertical = orientation === "vertical"
  const valueText =
    formatValue?.(state.getThumbValue(0)) ?? state.getThumbValueLabel(0)
  const reset = () => {
    state.setThumbValue(
      0,
      resetValue ?? props.defaultValue ?? state.getThumbMinValue(0)
    )
  }

  return (
    <div
      {...groupProps}
      data-slot="fader"
      data-orientation={orientation}
      className={cn(
        "inline-flex w-fit items-center gap-2",
        isVertical ? "flex-col" : "flex-row",
        className
      )}
    >
      <label {...labelProps} className="faceplate text-muted-foreground">
        {label}
      </label>
      <div
        ref={trackRef}
        data-slot="fader-track"
        className={cn(
          "relative rounded-full bg-control",
          isVertical ? "mx-4 h-fader w-1.5" : "my-4 h-1.5 w-fader"
        )}
      >
        <div
          {...mergeProps(thumbProps, { onDoubleClick: reset })}
          data-slot="fader-cap"
          data-dragging={isDragging || undefined}
          data-focus-visible={isFocusVisible || undefined}
          className={cn(
            "flex items-center justify-center rounded-sm border border-control-border bg-raised shadow-raised outline-offset-2 outline-focus data-focus-visible:outline-2",
            isVertical
              ? "h-target w-[calc(var(--wf-target-min)*1.6)] cursor-ns-resize"
              : "h-[calc(var(--wf-target-min)*1.6)] w-target cursor-ew-resize"
          )}
        >
          <span
            aria-hidden
            className={cn(
              "bg-foreground",
              isVertical ? "h-0.5 w-3/5" : "h-3/5 w-0.5"
            )}
          />
          <VisuallyHidden>
            <input
              ref={inputRef}
              {...mergeProps(inputProps, focusProps)}
              aria-valuetext={valueText}
            />
          </VisuallyHidden>
        </div>
      </div>
      <output {...outputProps} className="readout text-readout-sm">
        {valueText}
      </output>
    </div>
  )
}

export { Fader, type FaderProps }
