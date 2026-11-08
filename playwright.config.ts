import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  outputDir: 'test-results',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    ...devices['Pixel 5'],
    viewport: { width: 360, height: 740 },
    browserName: 'chromium',
  },
  webServer: {
    command: 'npm run build && npx vite preview --host 127.0.0.1 --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
