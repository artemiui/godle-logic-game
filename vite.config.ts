import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

// unslop test environment: runs beside the main checkout
// (main: app 5173 / api 3001, unslop: app 5174 / api 3002)
const API_PORT = process.env.API_PORT || '3002';

export default defineConfig({
  plugins: [svelte()],
  server: {
    port: 5174,
    strictPort: true,
    proxy: {
      '/api': {
        target: `http://localhost:${API_PORT}`,
        changeOrigin: true,
      }
    }
  }
});
