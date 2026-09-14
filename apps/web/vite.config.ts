import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [react()],
  server: {
    // Arena previews are proxied through a dynamic e2b.app hostname.
    allowedHosts: true,
  },
  resolve: {
    alias: {
      '@lifeos/shared': fileURLToPath(new URL('../../packages/shared/src/index.ts', import.meta.url)),
    },
  },
});
