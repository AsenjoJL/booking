import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('@react-three/fiber') || id.includes('@react-three/drei') || id.includes('three')) {
            return 'three-vendor'
          }

          if (id.includes('@react-spring/three') || id.includes('@react-spring/core') || id.includes('@react-spring/shared')) {
            return 'spring-vendor'
          }
        },
      },
    },
  },
})
