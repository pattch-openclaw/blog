import type { FullConfig } from '@playwright/test';

// This file exists for future expansion (e.g., dynamic test fixture setup).
// Currently the mock store is committed as a static file and activated via
// CONTENT_STORE=test-mock in playwright.config.ts webServer command.
export default async function globalSetup(_config: FullConfig) {
	// No-op for now — the mock store is a committed file.
}
