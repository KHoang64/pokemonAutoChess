import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import type { Connect } from "vite"
import { defineConfig, type Plugin } from "vite"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, "..")

/** Serve /assets from prototype public first, then parent build output, then parent source. */
function parentAssetsPlugin(): Plugin {
  const assetRoots = [
    path.join(__dirname, "public", "assets"),
    path.join(repoRoot, "app", "public", "dist", "client", "assets"),
    path.join(repoRoot, "app", "public", "src", "assets")
  ]

  const mime: Record<string, string> = {
    ".png": "image/png",
    ".json": "application/json",
    ".svg": "image/svg+xml"
  }

  const handler: Connect.NextHandleFunction = (req, res, next) => {
    const raw = req.url ?? ""
    if (!raw.startsWith("/assets/")) {
      next()
      return
    }

    const urlPath = decodeURIComponent(raw.split("?")[0]!)
    const relative = urlPath.replace(/^\/assets\/?/, "")

    for (const root of assetRoots) {
      const filePath = path.join(root, relative)
      if (!filePath.startsWith(root) || !fs.existsSync(filePath)) continue

      const ext = path.extname(filePath).toLowerCase()
      res.statusCode = 200
      res.setHeader("Content-Type", mime[ext] ?? "application/octet-stream")
      res.setHeader("Cache-Control", "no-cache")
      fs.createReadStream(filePath).pipe(res)
      return
    }

    res.statusCode = 404
    res.setHeader("Content-Type", "text/plain")
    res.end(`Asset not found: ${urlPath}`)
  }

  return {
    name: "parent-assets",
    configureServer(server) {
      server.middlewares.use(handler)
    },
    configurePreviewServer(server) {
      server.middlewares.use(handler)
    }
  }
}

export default defineConfig({
  plugins: [parentAssetsPlugin()],
  server: {
    fs: {
      allow: [repoRoot]
    }
  },
  build: {
    outDir: "dist",
    emptyOutDir: true
  }
})
