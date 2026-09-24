import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, 'src') },
  },
  server: {
    // En desarrollo /api se redirige al backend: sin problemas de CORS ni URLs absolutas.
    proxy: { '/api': 'http://localhost:3000' },
  },
});
