"use client"

import type { VariantProps } from "class-variance-authority"
import { cn } from "cn"
import { createContext, use, type CSSProperties, type ReactNode } from "react"
import {
  ToggleButtonGroup as ToggleGroupPrimitive,
  ToggleButton as TogglePrimitive,
  type ToggleButtonGroupProps,
  type ToggleButtonProps,
} from "react-aria-components"

import { toggleVariants } from "@waveform/ui/components/toggle"

type ToggleVariants = VariantProps<typeof toggleVariants>

const ToggleGroupContext = createContext<ToggleVariants & { spacing: number }>({
  spacing: 2,
})

interface ToggleGroupProps
  extends
    Omit<ToggleButtonGroupProps, "children" | "className">,
    ToggleVariants {
  /** The gap between items, in spacing units. 0 joins them into one segmented control. */
  spacing?: number
  className?: string
  children?: ReactNode
}

function ToggleGroup({
  className,
  variant,
  size,
  spacing = 2,
  orientation = "horizontal",
  children,
  ...props
}: ToggleGroupProps) {
  return (
    <ToggleGroupPrimitive
      data-slot="toggle-group"
      data-variant={variant}
      data-size={size}
      data-spacing={spacing}
      orientation={orientation}
      style={
        {
          "--gap": `calc(var(--spacing) * ${String(spacing)})`,
        } as CSSProperties
      }
      className={cn(
        "group/toggle-group flex w-fit flex-row items-center gap-(--gap) rounded-md data-[orientation=vertical]:flex-col data-[orientation=vertical]:items-stretch",
        className
      )}
      {...props}
    >
      <ToggleGroupContext value={{ variant, size, spacing }}>
        {children}
      </ToggleGroupContext>
    </ToggleGroupPrimitive>
  )
}

interface ToggleGroupItemProps
  extends Omit<ToggleButtonProps, "className">, ToggleVariants {
  className?: string
}

function ToggleGroupItem({
  className,
  variant,
  size,
  ...props
}: ToggleGroupItemProps) {
  const context = use(ToggleGroupContext)
  const itemVariant = context.variant ?? variant
  const itemSize = context.size ?? size

  return (
    <TogglePrimitive
      data-slot="toggle-group-item"
      data-variant={itemVariant}
      data-size={itemSize}
      data-spacing={context.spacing}
      className={cn(
        "shrink-0 group-data-[spacing=0]/toggle-group:rounded-none focus-visible:z-10 group-data-[orientation=horizontal]/toggle-group:data-[spacing=0]:first:rounded-l-md group-data-[orientation=vertical]/toggle-group:data-[spacing=0]:first:rounded-t-md group-data-[orientation=horizontal]/toggle-group:data-[spacing=0]:last:rounded-r-md group-data-[orientation=vertical]/toggle-group:data-[spacing=0]:last:rounded-b-md group-data-[orientation=horizontal]/toggle-group:data-[spacing=0]:data-[variant=outline]:border-l-0 group-data-[orientation=vertical]/toggle-group:data-[spacing=0]:data-[variant=outline]:border-t-0 group-data-[orientation=horizontal]/toggle-group:data-[spacing=0]:data-[variant=outline]:first:border-l group-data-[orientation=vertical]/toggle-group:data-[spacing=0]:data-[variant=outline]:first:border-t",
        toggleVariants({ variant: itemVariant, size: itemSize }),
        className
      )}
      {...props}
    />
  )
}

export { ToggleGroup, ToggleGroupItem }
