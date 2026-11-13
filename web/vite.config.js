import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const previewMode = process.env.BASE44_PREVIEW_MODE === '1';
const sandboxDomain = process.env.BASE44_SANDBOX_HOST_DOMAIN;

const allowedHosts = ['localhost', '127.0.0.1'];
if (previewMode && sandboxDomain) {
  allowedHosts.push(`.${sandboxDomain}`);
}

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    allowedHosts,
    watch: { usePolling: true, interval: 400 },
    proxy: {
      '/api': {
        target: 'http://api:8000',
        changeOrigin: false,
      },
    },
  },
});
