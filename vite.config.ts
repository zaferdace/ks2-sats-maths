import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// Served from https://<user>.github.io/ks2-sats-maths/
const base = '/ks2-sats-maths/';

export default defineConfig({
  // The bundled English question bank makes one large script on purpose (it all works offline).
  build: { chunkSizeWarningLimit: 2000 },
  base,
  plugins: [
    react(),
    tailwindcss(),
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
        // Fonts are bundled (woff2) and must be precached too, or the app falls back to another font offline.
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        // The English question bank is bundled into the main script (about 1 MB); allow room to grow.
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        cleanupOutdatedCaches: true,
      },
    }),
  ],
});
