import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [react()],
  server: {
    // Arena previews are proxied through a dynamic e2b.app hostname.
    allowedHosts: true,
    // /api 反代到本地 Fastify（同源，refresh httpOnly cookie 无跨站问题）
    proxy: { '/api': { target: 'http://localhost:3000', changeOrigin: true } },
  },
  resolve: {
    alias: {
      '@lifeos/shared': fileURLToPath(new URL('../../packages/shared/src/index.ts', import.meta.url)),
    },
  },
  build: {
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom', 'zustand'],
          'vendor-antd': ['antd', '@ant-design/icons'],
          'vendor-motion': ['framer-motion', 'canvas-confetti'],
        },
      },
    },
  },
});
