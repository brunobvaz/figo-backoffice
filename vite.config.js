import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode, command }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const proxy = {
    '/api': { target: env.API_PROXY_TARGET || 'http://localhost:3000', changeOrigin: true },
    '/uploads': { target: env.API_PROXY_TARGET || 'http://localhost:3000', changeOrigin: true },
  };
  return {
    plugins: [react()],
    // Cloudflare serves the API through the Worker on the frontend's own origin.
    // An existing local .env must never embed a cross-site API URL in this build.
    define:
      command === 'build' ? { 'import.meta.env.VITE_API_URL': JSON.stringify('/api/v1') } : {},
    server: { host: '127.0.0.1', port: 5173, strictPort: true, proxy },
    preview: { host: '127.0.0.1', port: 5173, strictPort: true, proxy },
  };
});
