import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  output: "export",
  agentRules: false,
  transpilePackages: [
    "@waveform/ui",
    "@waveform/design-tokens",
    "@waveform/core-utils",
    "@waveform/types",
  ],
}

export default nextConfig
