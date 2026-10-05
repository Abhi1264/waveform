// Serves the static export in out/ for the end-to-end tests.
import { createReadStream } from "node:fs"
import { stat } from "node:fs/promises"
import { createServer } from "node:http"
import { extname, join, resolve, sep } from "node:path"

const root = resolve(import.meta.dirname, "../out")
const port = Number(process.env.PORT ?? "4173")

const contentTypes: Record<string, string> = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".woff2": "font/woff2",
}

async function findFile(pathname: string): Promise<string | undefined> {
  const path = join(root, decodeURIComponent(pathname))
  // Encoded separators can still climb out of root after decoding.
  if (path !== root && !path.startsWith(root + sep)) return undefined

  for (const candidate of [path, `${path}.html`, join(path, "index.html")]) {
    const info = await stat(candidate).catch(() => undefined)
    if (info?.isFile()) return candidate
  }
  return undefined
}

createServer((request, response) => {
  const { pathname } = new URL(request.url ?? "/", "http://localhost")
  void findFile(pathname).then((file) => {
    const path = file ?? join(root, "404.html")
    response.writeHead(file ? 200 : 404, {
      "Content-Type": contentTypes[extname(path)] ?? "application/octet-stream",
    })
    createReadStream(path).pipe(response)
  })
}).listen(port, "127.0.0.1")
