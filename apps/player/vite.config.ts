import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: { port: 5174 },
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        // Keep bundle small for WebView performance
        manualChunks: {
          react: ['react', 'react-dom'],
          motion: ['framer-motion'],
          engine: ['@konstruktor/quiz-engine'],
        },
      },
    },
  },
})
