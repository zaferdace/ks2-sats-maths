import { configDefaults, defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config.ts';

// Unit tests (npm test). e2e/ holds the Playwright browser tests, which run with npm run e2e;
// .claude/ holds local worktrees (other checkouts), whose tests are not this checkout's.
export default mergeConfig(viteConfig, defineConfig({ test: { exclude: [...configDefaults.exclude, 'e2e/**', '.claude/**'] } }));
