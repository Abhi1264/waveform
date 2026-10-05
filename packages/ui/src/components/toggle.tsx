"use client"

import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"
import {
  ToggleButton as TogglePrimitive,
  type ToggleButtonProps,
} from "react-aria-components"

const toggleVariants = cva(
  "group/toggle inline-flex items-center justify-center gap-control-gap rounded-md text-body font-medium whitespace-nowrap transition-[color,background-color,border-color] duration-(--wf-duration-fast) outline-none hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-icon",
  {
    variants: {
      variant: {
        /** Selected toggles invert, like the primary action. */
        default:
          "bg-transparent data-selected:bg-primary data-selected:text-primary-foreground",
        outline:
          "border border-input bg-transparent data-selected:border-primary data-selected:bg-primary data-selected:text-primary-foreground",
        /** Engaged deck controls light up in the colour of the deck they belong to (set with data-deck). */
        deck: "border border-input bg-transparent faceplate data-selected:border-deck data-selected:bg-deck data-selected:text-on-signal",
      },
      size: {
        default:
          "h-control min-w-control px-control-x has-data-[icon=inline-end]:pr-[calc(var(--wf-control-padding-x)*0.75)] has-data-[icon=inline-start]:pl-[calc(var(--wf-control-padding-x)*0.75)]",
        sm: "h-control-sm min-w-control-sm px-[calc(var(--wf-control-padding-x)*0.75)] text-caption",
        lg: "h-control-lg min-w-control-lg px-[calc(var(--wf-control-padding-x)*1.25)]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Toggle({
  className,
  variant = "default",
  size = "default",
  ...props
}: Omit<ToggleButtonProps, "className"> &
  VariantProps<typeof toggleVariants> & {
    className?: string
  }) {
  return (
    <TogglePrimitive
      data-slot="toggle"
      className={cn(toggleVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Toggle, toggleVariants }
