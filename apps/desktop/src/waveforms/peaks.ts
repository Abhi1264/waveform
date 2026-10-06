/** Draws a peak envelope. `peaks` alternates minimum and maximum per column. */
function drawPeaks(
  context: CanvasRenderingContext2D,
  peaks: ArrayLike<number>,
  playhead: number,
  color: string
) {
  const { width, height } = context.canvas
  context.clearRect(0, 0, width, height)
  context.fillStyle = color
  const columns = Math.max(1, Math.floor(peaks.length / 2))
  const columnWidth = width / columns
  for (let column = 0; column < columns; column += 1) {
    const min = peaks[column * 2] ?? 0
    const max = peaks[column * 2 + 1] ?? 0
    const top = (1 - max) * 0.5 * height
    const bottom = (1 - min) * 0.5 * height
    context.fillRect(
      column * columnWidth,
      top,
      Math.max(1, columnWidth - 1),
      Math.max(1, bottom - top)
    )
  }
  const x = Math.min(width, Math.max(0, playhead)) * width
  context.fillStyle = color
  context.fillRect(x, 0, 1, height)
}

export { drawPeaks }
