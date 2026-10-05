/** A colour in OKLCH: lightness 0–1, chroma, and hue in degrees. */
export interface Oklch {
  readonly l: number
  readonly c: number
  readonly h: number
}

export function oklch(l: number, c: number, h: number): Oklch {
  return { l, c, h }
}

/** The colour as a CSS value, for example "oklch(0.72 0.15 250)". */
export function toCss({ l, c, h }: Oklch): string {
  return `oklch(${round(l, 3)} ${round(c, 3)} ${round(h, 1)})`
}

/** Linear-light sRGB channels, unclamped, using Björn Ottosson's OKLab matrices. */
export function toLinearSrgb({ l, c, h }: Oklch): [number, number, number] {
  const radians = (h * Math.PI) / 180
  const a = c * Math.cos(radians)
  const b = c * Math.sin(radians)

  const lCone = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const mCone = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const sCone = (l - 0.0894841775 * a - 1.291485548 * b) ** 3

  return [
    4.0767416621 * lCone - 3.3077115913 * mCone + 0.2309699292 * sCone,
    -1.2684380046 * lCone + 2.6097574011 * mCone - 0.3413193965 * sCone,
    -0.0041960863 * lCone - 0.7034186147 * mCone + 1.707614701 * sCone,
  ]
}

/** Whether every channel fits sRGB, so every display shows the colour as specified. */
export function isInSrgbGamut(color: Oklch): boolean {
  const tolerance = 1e-4
  return toLinearSrgb(color).every(
    (channel) => channel >= -tolerance && channel <= 1 + tolerance
  )
}

/** The colour as "#rrggbb", clamped to sRGB. */
export function toHex(color: Oklch): string {
  return `#${toLinearSrgb(color)
    .map((channel) =>
      Math.round(encodeGamma(clamp(channel)) * 255)
        .toString(16)
        .padStart(2, "0")
    )
    .join("")}`
}

/** WCAG 2 relative luminance, from the colour clamped to sRGB. */
export function relativeLuminance(color: Oklch): number {
  const [red, green, blue] = toLinearSrgb(color).map(clamp) as [
    number,
    number,
    number,
  ]
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue
}

/** WCAG 2 contrast ratio, from 1 (none) to 21 (black on white). */
export function contrastRatio(first: Oklch, second: Oklch): number {
  const [lighter, darker] = [
    relativeLuminance(first),
    relativeLuminance(second),
  ].sort((x, y) => y - x) as [number, number]
  return (lighter + 0.05) / (darker + 0.05)
}

function encodeGamma(channel: number): number {
  return channel <= 0.0031308
    ? 12.92 * channel
    : 1.055 * channel ** (1 / 2.4) - 0.055
}

function clamp(channel: number): number {
  return Math.min(1, Math.max(0, channel))
}

function round(value: number, decimals: number): number {
  return Number(value.toFixed(decimals))
}
