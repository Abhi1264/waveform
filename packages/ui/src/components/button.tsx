"use client"

import type * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"
import {
  Button as ButtonPrimitive,
  Link as LinkPrimitive,
  type ButtonProps as ButtonPrimitiveProps,
  type LinkProps as LinkPrimitiveProps,
} from "react-aria-components"

// Sizes come from the density tokens. There is no extra-small size: it would
// fall below the 24 px minimum target.
const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center gap-control-gap rounded-md border border-transparent bg-clip-padding text-body font-medium whitespace-nowrap transition-[color,background-color,border-color,translate] duration-(--wf-duration-fast) outline-none select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-icon",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:bg-primary/85 data-pressed:bg-primary/75",
        outline:
          "border-input bg-transparent hover:bg-accent aria-expanded:bg-accent data-pressed:bg-control",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-accent aria-expanded:bg-accent data-pressed:bg-accent",
        ghost:
          "hover:bg-accent aria-expanded:bg-accent data-pressed:bg-control",
        destructive:
          "bg-danger-surface text-destructive hover:border-destructive/40 data-pressed:border-destructive/60",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default:
          "h-control px-control-x has-data-[icon=inline-end]:pr-[calc(var(--wf-control-padding-x)*0.75)] has-data-[icon=inline-start]:pl-[calc(var(--wf-control-padding-x)*0.75)]",
        sm: "h-control-sm px-[calc(var(--wf-control-padding-x)*0.75)] text-caption",
        lg: "h-control-lg px-[calc(var(--wf-control-padding-x)*1.25)]",
        icon: "size-control",
        "icon-sm": "size-control-sm",
        "icon-lg": "size-control-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: Omit<ButtonPrimitiveProps, "className"> &
  React.RefAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    className?: string
  }) {
  return (
    <ButtonPrimitive
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

function LinkButton({
  className,
  variant = "default",
  size = "default",
  ...props
}: Omit<LinkPrimitiveProps, "className"> &
  VariantProps<typeof buttonVariants> & {
    className?: string
  }) {
  return (
    <LinkPrimitive
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, LinkButton, buttonVariants }
