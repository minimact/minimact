import { defineConfig } from 'vite';

export default defineConfig({
  optimizeDeps: {
    include: ['monaco-editor']
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          monaco: ['monaco-editor']
        }
      }
    }
  }
});
