// Fails the build when the service worker's precache list is broken. A URL listed twice with
// different revisions makes Workbox throw during install, and the app silently loses offline mode.
import { readFileSync } from 'node:fs';

const sw = readFileSync(new URL('../dist/sw.js', import.meta.url), 'utf8');
const urls = [...sw.matchAll(/url:"([^"]+)"/g)].map((m) => m[1]);
const duplicates = urls.filter((u, i) => urls.indexOf(u) !== i);

if (duplicates.length || !urls.includes('index.html')) {
  console.error(`Bad precache list. Duplicates: ${duplicates.join(', ') || 'none'}. index.html listed: ${urls.includes('index.html')}.`);
  process.exit(1);
}
console.log(`Service worker precaches ${urls.length} files.`);
