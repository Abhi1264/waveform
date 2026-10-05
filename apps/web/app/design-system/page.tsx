import type { Metadata } from "next"

import { DesignSystemView } from "./view"

export const metadata: Metadata = {
  title: "Design system · Waveform",
  description:
    "Tokens, type, density and DJ controls for Waveform. Specimens are labelled as specimens; nothing here plays audio.",
}

export default function DesignSystemPage() {
  return <DesignSystemView />
}
