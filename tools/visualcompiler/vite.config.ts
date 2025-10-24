import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// Vite config for Visual Compiler component analysis
export default defineConfig({
  plugins: [
    react(),
    // Custom plugin to replace React imports with shims
    {
      name: 'react-shim-transform',
      transform(code, id) {
        // Apply to all TypeScript/JSX files, including FailSquare frontend
        if ((id.endsWith('.tsx') || id.endsWith('.jsx')) && !id.includes('node_modules')) {
          // Replace React imports with our shim
          let transformedCode = code;

          // Replace main React import
          transformedCode = transformedCode.replace(
            /import\s+React(?:\s*,\s*\{[^}]*\})?\s+from\s+['"]react['"];?/g,
            `import React from '@/utils/react-shim.js';`
          );

          // Replace named React imports
          transformedCode = transformedCode.replace(
            /import\s+\{([^}]*)\}\s+from\s+['"]react['"];?/g,
            (match, imports) => {
              return `import { ${imports} } from '@/utils/react-shim.js';`;
            }
          );

          // Replace useAuth hooks
          transformedCode = transformedCode.replace(
            /import\s+\{[^}]*useAuth[^}]*\}\s+from\s+['"][^'"]*['"];?/g,
            `import { useAuth } from '@/utils/react-shim.js';`
          );

          // Replace useTabNavigation hooks
          transformedCode = transformedCode.replace(
            /import\s+\{[^}]*useTabNavigation[^}]*\}\s+from\s+['"][^'"]*['"];?/g,
            `import { useTabNavigation } from '@/utils/react-shim.js';`
          );

          return transformedCode;
        }
        return null;
      }
    }
  ],
  resolve: {
    alias: {
      // Alias to Visual Compiler source
      '@': path.resolve(__dirname, 'src'),
      // Alias to FailSquare frontend components
      '@failsquare': path.resolve(__dirname, '../failsquare-frontend/src')
    }
  },
  build: {
    lib: {
      entry: 'src/vite-renderer.ts',
      name: 'VisualCompilerRenderer',
      fileName: 'vite-renderer'
    },
    rollupOptions: {
      external: ['react', 'react-dom'],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM'
        }
      }
    }
  }
});