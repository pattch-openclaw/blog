import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
	testDir: 'tests',
	globalSetup: './playwright.setup.ts',
	webServer: {
		command: 'npm run build && SHOW_DRAFTS=true CONTENT_STORE=test-mock npm run preview',
		port: 4173,
		timeout: 120000,
		reuseExistingServer: !process.env.CI
	},
	use: {
		baseURL: 'http://localhost:4173',
		trace: 'on-first-retry'
	},
	projects: [
		{
			name: 'chromium',
			use: { 
				...devices['Desktop Chrome'],
				viewport: { width: 1280, height: 720 }
			}
		}
	]
});
