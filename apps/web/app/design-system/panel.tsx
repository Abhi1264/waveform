import { Badge } from "@waveform/ui/components/badge"
import type { ReactNode } from "react"

interface PanelProps {
  id: string
  /** Short faceplate label, such as "Colour". */
  eyebrow: string
  title: string
  children: ReactNode
  specimen?: boolean
  className?: string
}

/** A labelled section of the design-system page. */
function Panel({
  id,
  eyebrow,
  title,
  children,
  specimen = false,
  className,
}: PanelProps) {
  const headingId = `${id}-heading`

  return (
    <section
      id={id}
      aria-labelledby={headingId}
      className={
        className
          ? `flex scroll-mt-24 flex-col gap-5 ${className}`
          : "flex scroll-mt-24 flex-col gap-5"
      }
    >
      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <p className="faceplate text-muted-foreground">{eyebrow}</p>
          {specimen && <Badge variant="outline">Specimen</Badge>}
        </div>
        <h2 id={headingId} className="text-heading text-pretty">
          {title}
        </h2>
      </header>
      {children}
    </section>
  )
}

export { Panel }
