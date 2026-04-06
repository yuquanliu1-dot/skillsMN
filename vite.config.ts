import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './',
  root: 'src/renderer',
  publicDir: path.resolve(__dirname, 'src/renderer/public'),
  server: {
    port: 5173,
    strictPort: true,
    host: true
  },
  build: {
    outDir: path.resolve(__dirname, 'dist/renderer'),
    emptyOutDir: false,
    dropConsole: true,
    dropDebugger: true,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'src/renderer/index.html')
      }
    }
  },
  resolve: {
    alias: {
      '@': '/src/renderer'
    }
  }
})
