import { defineConfig, devices } from '@playwright/test';

// 배포 결과물과 같은 정적 빌드(vite preview)를 대상으로 AC-01~15, QC-01~05를 검사한다.
// 미리보기 배포 주소에서 돌리려면 E2E_BASE_URL을 지정한다 (TC-06).
const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:4173';

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list']],
  use: { baseURL, trace: 'retain-on-failure' },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: 'npm run build && npx vite preview --port 4173 --strictPort',
        url: 'http://localhost:4173',
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
