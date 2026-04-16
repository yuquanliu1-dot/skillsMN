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
    port: 5199,
    strictPort: true,
    host: true
  },
  build: {
    outDir: path.resolve(__dirname, 'dist/renderer'),
    emptyOutDir: true,
    dropConsole: true,
    dropDebugger: true,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'src/renderer/index.html')
      },
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // Monaco Editor — large, only needed in skill editor
            if (id.includes('monaco-editor')) return 'monaco';
            // Shiki syntax highlighting
            if (id.includes('shiki')) return 'shiki';
            // Mermaid diagrams
            if (id.includes('mermaid')) return 'mermaid';
            // Markdown rendering
            if (id.includes('react-markdown') || id.includes('remark') || id.includes('rehype')) return 'markdown';
            // i18n
            if (id.includes('i18next') || id.includes('react-i18next')) return 'i18n';
            // Everything else (react, tiptap, etc. — kept together to avoid circular deps)
            return 'vendor';
          }
        }
      }
    }
  },
  resolve: {
    alias: {
      '@': '/src/renderer'
    }
  }
})
