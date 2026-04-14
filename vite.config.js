import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: (process.env.VITE_ELECTRON === 'true' || process.env.VITE_CAPACITOR === 'true') ? '/' : '/mmn/',
  publicDir: 'src/public',
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'terser',
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
});
