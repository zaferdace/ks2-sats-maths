import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// Served from https://<user>.github.io/ks2-sats-maths/
const base = '/ks2-sats-maths/';

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      pwaAssets: { config: true },
      manifest: {
        name: 'KS2 SATs practice',
        short_name: 'KS2 SATs',
        description: 'KS2 SATs practice for Year 6: maths and English papers, made on the device.',
        lang: 'en-GB',
        start_url: base,
        scope: base,
        display: 'standalone',
        orientation: 'any',
        background_color: '#f9f9f7',
        theme_color: '#256abf',
      },
      workbox: {
        // The plugin adds manifest.webmanifest itself; globbing it too creates a conflicting entry.
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
});
