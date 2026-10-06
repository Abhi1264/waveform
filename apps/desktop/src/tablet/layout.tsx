import type { ReactNode } from "react"

interface TabletFrameProps {
  orientation: "portrait" | "landscape"
  children: ReactNode
}

/** One arrangement of the decks. Portrait stacks them; landscape sits them side by side. */
function TabletFrame({ orientation, children }: TabletFrameProps) {
  return (
    <div
      data-orientation={orientation}
      className={
        orientation === "portrait"
          ? "flex flex-col gap-8"
          : "grid grid-cols-1 gap-8 lg:grid-cols-2"
      }
    >
      {children}
    </div>
  )
}

/** A touch sheet. The summary is at least 44px tall. */
function BottomSheet({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <details className="rounded-md border border-divider">
      <summary className="min-h-11 cursor-default px-3 py-2">{label}</summary>
      <div className="px-3 pb-3">{children}</div>
    </details>
  )
}

export { BottomSheet, TabletFrame }
