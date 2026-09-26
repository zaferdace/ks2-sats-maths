import { defineConfig } from '@playwright/test';

// Browser smoke tests (e2e/): the built app, driven like the child uses it on the iPad.
// E2E_PORT picks another port when 4173 is taken (another checkout's preview, for example).
const port = Number(process.env.E2E_PORT ?? 4173);
const baseURL = `http://localhost:${port}/ks2-sats-maths/`;
const ci = Boolean(process.env.CI);

const ipad = { browserName: 'chromium', hasTouch: true, isMobile: true, deviceScaleFactor: 2 } as const;

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: ci,
  retries: ci ? 1 : 0,
  reporter: ci ? [['github'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL,
    // Every test starts from a fresh install: no service worker cache between runs.
    serviceWorkers: 'block',
    // A tap on a button that never appears fails in 10 s rather than at the 30 s test timeout.
    actionTimeout: 10_000,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'ipad-landscape', use: { ...ipad, viewport: { width: 1024, height: 768 } } },
    { name: 'ipad-portrait', use: { ...ipad, viewport: { width: 768, height: 1024 } } },
  ],
  webServer: {
    // CI tests the dist/ it is about to deploy (built by the step before); locally, build first so
    // a stale dist/ is never tested.
    command: `${ci ? '' : 'npm run build && '}npx vite preview --port ${port} --strictPort`,
    url: baseURL,
    // Never test a server started elsewhere: it may be serving another checkout's build.
    reuseExistingServer: false,
    timeout: 180_000,
  },
});
