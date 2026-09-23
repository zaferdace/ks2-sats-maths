// Fails the build when the service worker's precache list is broken. A URL listed twice with
// different revisions makes Workbox throw during install, and the app silently loses offline mode.
// Every built script must be precached too: Workbox skips files over its size limit with only a
// warning, and the English question bank makes the main script large.
import { readdirSync, readFileSync } from 'node:fs';

const sw = readFileSync(new URL('../dist/sw.js', import.meta.url), 'utf8');
const urls = [...sw.matchAll(/url:"([^"]+)"/g)].map((m) => m[1]);
const duplicates = urls.filter((u, i) => urls.indexOf(u) !== i);
const scripts = readdirSync(new URL('../dist/assets/', import.meta.url)).filter((f) => f.endsWith('.js'));
const missing = scripts.filter((f) => !urls.includes(`assets/${f}`));

if (duplicates.length || !urls.includes('index.html') || missing.length) {
  console.error(
    `Bad precache list. Duplicates: ${duplicates.join(', ') || 'none'}. index.html listed: ${urls.includes('index.html')}. ` +
      `Scripts missing: ${missing.join(', ') || 'none'}.`,
  );
  process.exit(1);
}
console.log(`Service worker precaches ${urls.length} files.`);
