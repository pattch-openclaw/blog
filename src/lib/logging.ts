/**
 * Simple timestamped logger for the blog service.
 * All log lines include an ISO-8601 timestamp so they're
 * independently readable even outside PM2's own log wrapper.
 */

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

export const logger = {
	info:  (...args: any[]) => _log('info',  ...args),
	warn:  (...args: any[]) => _log('warn',  ...args),
	error: (...args: any[]) => _log('error', ...args),
	debug: (...args: any[]) => _log('debug', ...args),
};
