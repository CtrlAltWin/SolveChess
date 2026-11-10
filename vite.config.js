import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/**
 * Custom plugin to cleanly serve ONNX Runtime Web WebAssembly and Emscripten MJS assets.
 * Vite's built-in `viteTransformMiddleware` rejects dynamic `import()` targeting files inside `/public`,
 * throwing ERR_LOAD_PUBLIC_URL.
 * This middleware intercepts requests to `/ort/` before Vite's transform middleware,
 * serving the static WASM binaries and JS modules directly with appropriate MIME types
 * and Cross-Origin isolation headers.
 */
function onnxWasmPlugin() {
  const serveOrtAsset = (req, res, next) => {
    const rawUrl = req.url ? req.url.split('?')[0] : ''
    if (rawUrl.startsWith('/ort/')) {
      const filename = path.basename(rawUrl)
      const filePath = path.resolve(__dirname, 'public/ort', filename)
      if (fs.existsSync(filePath)) {
        if (filename.endsWith('.wasm')) {
          res.setHeader('Content-Type', 'application/wasm')
        } else if (filename.endsWith('.mjs') || filename.endsWith('.js')) {
          res.setHeader('Content-Type', 'application/javascript')
        }
        res.setHeader('Cross-Origin-Opener-Policy', 'same-origin')
        res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless')
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
        return fs.createReadStream(filePath).pipe(res)
      }
    }
    next()
  }

  return {
    name: 'onnx-wasm-plugin',
    configureServer(server) {
      server.middlewares.use(serveOrtAsset)
    },
    configurePreviewServer(server) {
      server.middlewares.use(serveOrtAsset)
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    onnxWasmPlugin(),
  ],
  optimizeDeps: {
    exclude: ['onnxruntime-web'],
  },
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'credentialless',
    },
  },
  preview: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'credentialless',
    },
  },
})
