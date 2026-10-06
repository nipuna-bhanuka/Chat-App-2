import path from 'node:path'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import { createApiHandler } from './server/api.mjs'
import tailwindcss from '@tailwindcss/vite'

const rootDir = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig(({ mode }) => ({
  envPrefix: 'VITE_PUBLIC_',
  plugins: [react(), tailwindcss(), {
    name: 'claritas-api',
    configureServer(server) { server.middlewares.use(createApiHandler(loadEnv(mode, rootDir, ''))) },
    configurePreviewServer(server) { server.middlewares.use(createApiHandler(loadEnv(mode, rootDir, ''))) },
  }],
  resolve: {
    alias: {
      '@': path.resolve(rootDir, 'src'),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
}))
