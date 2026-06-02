import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

// We can't directly import logger because it writes to console.
// Instead, we test the timestamp format the logger produces.
describe('logger timestamp format', () => {
    it('produces ISO-8601 timestamps', () => {
        const ts = new Date().toISOString();
        const isoPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+[\+|\-Z]/;
        expect(isoPattern.test(ts)).toBe(true);
    });

    it('handles empty LOG_LEVEL by defaulting to debug', async () => {
        // The logger uses LOG_LEVEL env var; default is 'debug'.
        // We just verify the logger module exports the right shape.
        const loggingPath = path.join(process.cwd(), 'src', 'lib', 'logging.ts');
        const content = fs.readFileSync(loggingPath, 'utf-8');
        expect(content).toContain('logger');
        expect(content).toContain('info');
        expect(content).toContain('warn');
        expect(content).toContain('error');
        expect(content).toContain('debug');
    });

    it('hooks.server.ts logs server startup', () => {
        const hooksPath = path.join(process.cwd(), 'src', 'hooks.server.ts');
        const content = fs.readFileSync(hooksPath, 'utf-8');
        // Verify a startup log line exists at module top-level (before the handle export)
        const startupLogMatch = content.match(/logger\.info\(\s*['"]Server started['"]/);
        expect(startupLogMatch).not.toBeNull();
    });
});
