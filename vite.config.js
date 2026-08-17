import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // Ensures relative asset links work on GitHub Pages subpaths
  build: {
    outDir: 'docs', // Output directly to docs/ folder for GitHub Pages hosting
    emptyOutDir: true
  },
  server: {
    port: 5173,
    host: true
  }
});
