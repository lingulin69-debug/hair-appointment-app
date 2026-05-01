import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        importer: resolve(__dirname, 'import.html'),
        recovery: resolve(__dirname, 'recovery.html'),
      },
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('firebase') || id.includes('@firebase')) {
              return 'firebase';
            }

            if (id.includes('react')) {
              return 'react-vendor';
            }

            if (id.includes('lucide-react')) {
              return 'ui-icons';
            }
          }
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
})
