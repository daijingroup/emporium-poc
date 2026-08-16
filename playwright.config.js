import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:4173/emporium-poc/',
    trace: 'on-first-retry'
  },
  webServer: process.env.PLAYWRIGHT_BASE_URL ? undefined : {
    command: 'npm run preview -- --host 127.0.0.1',
    url: 'http://127.0.0.1:4173/emporium-poc/',
    reuseExistingServer: true
  },
  projects: [
    { name: 'mobile', use: { ...devices['iPhone 13'] } },
    { name: 'tablet', use: { ...devices['iPad Pro 11'] } },
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } }
  ]
})
