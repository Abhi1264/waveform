import type * as React from "react"
import { cn } from "cn"

const sizes = {
  sm: "text-readout-sm",
  md: "text-readout",
  lg: "text-readout-lg",
  xl: "text-readout-xl",
} as const

/** A row of readouts. Readouts are description-list entries, so they must sit inside one. */
function ReadoutGroup({ className, ...props }: React.ComponentProps<"dl">) {
  return (
    <dl
      data-slot="readout-group"
      className={cn("flex flex-wrap items-end gap-x-5 gap-y-3", className)}
      {...props}
    />
  )
}

interface ReadoutProps extends Omit<React.ComponentProps<"div">, "children"> {
  /** The faceplate label, such as "Tempo". */
  label: string
  /** The formatted value, such as "128.00". */
  value: string
  unit?: string
  size?: keyof typeof sizes
  /**
   * Characters of room to reserve, so the value can change without moving
   * what is around it. Defaults to the value's own length.
   */
  width?: number
}

/** A labelled value in the readout face, right-aligned so decimal points line up. */
function Readout({
  label,
  value,
  unit,
  size = "md",
  width,
  className,
  ...props
}: ReadoutProps) {
  return (
    <div
      data-slot="readout"
      className={cn("flex flex-col gap-0.5", className)}
      {...props}
    >
      <dt className="faceplate text-muted-foreground">{label}</dt>
      <dd className={cn("flex items-baseline gap-1", sizes[size])}>
        <span
          className="inline-block min-w-(--readout-width) text-right readout"
          style={
            {
              "--readout-width": `${String(width ?? value.length)}ch`,
            } as React.CSSProperties
          }
        >
          {value}
        </span>
        {unit && (
          <span className="faceplate text-muted-foreground">{unit}</span>
        )}
      </dd>
    </div>
  )
}

export { Readout, ReadoutGroup, type ReadoutProps }
