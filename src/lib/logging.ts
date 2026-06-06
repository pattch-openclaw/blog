/**
 * Simple timestamped logger for the blog service.
 * All log lines include an ISO-8601 timestamp so they're
 * independently readable even outside PM2's own log wrapper.
 */

import fs from 'fs';
import path from 'path';

const LEVELS = { info: 0, warn: 1, error: 2, debug: 3 } as const;
type Level = keyof typeof LEVELS;

function _log(level: Level, ...args: any[]): void {
	const ts = new Date().toISOString();
	const label = level.toUpperCase().padStart(5);
	const prefix = `${ts} [${label}]`;

	// Respect LOG_LEVEL env for stdout; stderr is always flushed.
	const logLevel = (process.env.LOG_LEVEL || 'debug').toLowerCase().trim();
	const minLevel = LEVELS[logLevel as Level] ?? LEVELS.debug;

	if (LEVELS[level] >= minLevel) {
		if (level === 'error') {
			console.error(prefix, ...args);
		} else {
			console.log(prefix, ...args);
		}
	}
}

/**
 * File-backed application log store for admin display.
 * Writes one line per entry to a JSONL file so the admin
 * logs page can surface structured app-level events.
 */
const APP_LOG_PATH = path.join(
	process.cwd(),
	'.app-logs.jsonl'
);

interface AppLogEntry {
	ts: string;
	level: 'info' | 'warn' | 'error' | 'debug';
	op: string;        // e.g. "supabase.savePost", "supabase.getPost", "supabase.listPosts"
	target?: string;   // e.g. slug or post id
	message: string;
	context?: Record<string, unknown>;
}

/**
 * Append a structured application log entry.
 * Non-blocking: failures to write to the log file are swallowed.
 */
function _appLog(entry: AppLogEntry): void {
	try {
		const line = JSON.stringify(entry);
		fs.appendFileSync(APP_LOG_PATH, line + '\n');
	} catch {
		// Log file write failure is non-fatal — we still want the error to propagate.
	}
}

export const logger = {
	info:  (...args: any[]) => _log('info',  ...args),
	warn:  (...args: any[]) => _log('warn',  ...args),
	error: (...args: any[]) => _log('error', ...args),
	debug: (...args: any[]) => _log('debug', ...args),

	/** Log a structured application event for admin display. */
	agent: (op: string, level: 'info' | 'warn' | 'error' | 'debug', message: string, ctx?: Record<string, unknown>, target?: string) => {
		const entry: AppLogEntry = { ts: new Date().toISOString(), op, level, message, context: ctx, target };
		_appLog(entry);
	},

	/** Return recent app log entries for admin display. */
	getAppLogs: (limit: number = 200): AppLogEntry[] => {
		try {
			const raw = fs.readFileSync(APP_LOG_PATH, 'utf-8');
			const lines = raw.trim().split('\n').filter(Boolean);
			const entries = lines.map(line => {
				try {
					return JSON.parse(line) as AppLogEntry;
				} catch {
					return null;
				}
			}).filter((e): e is AppLogEntry => e !== null);
			return entries.slice(-limit);
		} catch {
			return [];
		}
	},
};
