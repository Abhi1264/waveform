import type { Metadata } from "next"

import "@waveform/ui/globals.css"
import { PreferencesProvider } from "@waveform/ui/components/preferences-provider"
import { savedPreferencesScript } from "@waveform/ui/lib/preferences"

export const metadata: Metadata = {
  title: "Waveform",
  description:
    "Waveform is a cross-platform DJ workstation in early development.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    // The head script sets the saved theme and density on <html> before React hydrates.
    <html lang="en" suppressHydrationWarning className="antialiased">
      <head>
        <script dangerouslySetInnerHTML={{ __html: savedPreferencesScript }} />
      </head>
      <body>
        <PreferencesProvider>{children}</PreferencesProvider>
      </body>
    </html>
  )
}
