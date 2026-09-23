import { defineConfig, minimal2023Preset as preset } from '@vite-pwa/assets-generator/config';

// Full-bleed blue icons: iOS and Android apply their own rounded mask.
export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    ...preset,
    maskable: { ...preset.maskable, padding: 0, resizeOptions: { background: '#256abf' } },
    apple: { ...preset.apple, padding: 0, resizeOptions: { background: '#256abf' } },
  },
  images: ['public/icon.svg'],
});
