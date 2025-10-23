import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
  ],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '/api'),
      },
      '/babel-plugin': {
        target: 'file://' + path.resolve(__dirname, '../../src/babel-plugin-minimact/dist'),
        bypass(req) {
          // Serve files directly from the dist folder
          const filePath = path.resolve(__dirname, '../../src/babel-plugin-minimact/dist', req.url.replace('/babel-plugin/', ''));
          return null; // Let vite handle it
        },
      },
    },
  },
  resolve: {
    alias: {
      '@babel-plugin': path.resolve(__dirname, '../../src/babel-plugin-minimact/dist'),
    },
  },
})
