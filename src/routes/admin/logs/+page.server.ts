import { error } from '@sveltejs/kit';
import { exec } from 'child_process';
import { readFileSync } from 'fs';
import { promisify } from 'util';
import { getContentStore } from '$lib/server/posts-store';
import { logger } from '$lib/logging';

const execAsync = promisify(exec);

// Map content store to PM2 app name
function getLogAppName(): string {
    const store = getContentStore();
    switch (store) {
        case 'supabase': return 'sams-blog-sandbox';
        case 'git': return 'sams-blog-staging';
        default: return 'sams-blog-staging';
    }
}

// Strip ANSI escape sequences for clean output
function stripAnsi(input: string): string {
    return input.replace(/\x1b\[[0-9;]*m/g, '');
}

export const load = async () => {
    try {
        const appName = getLogAppName();
        
        // Try to read the pm2 logs for the appropriate environment.
        // We use --nostream to just dump the latest logs and exit.
        // If pm2 is not found globally, we can fallback to reading the default PM2 log files.
        let stdout = '';
        let stderr = '';
        
        try {
            const pm2Result = await execAsync(`npx pm2 logs ${appName} --nostream --lines 150`);
            stdout = stripAnsi(pm2Result.stdout);
            stderr = stripAnsi(pm2Result.stderr);
        } catch (e: any) {
            // If pm2 fails, try direct file read from standard PM2 paths as fallback
            const home = process.env.HOME || '/root';
            const pm2OutPath = `${home}/.pm2/logs/${appName}-out.log`;
            const pm2ErrPath = `${home}/.pm2/logs/${appName}-error.log`;
            
            try {
                const outRes = await execAsync(`tail -n 100 ${pm2OutPath}`);
                const errRes = await execAsync(`tail -n 100 ${pm2ErrPath}`);
                stdout = '--- OUT LOGS ---\n' + stripAnsi(outRes.stdout);
                stderr = '--- ERROR LOGS ---\n' + stripAnsi(errRes.stdout);
            } catch (fallbackErr: any) {
                // If even file reading fails, return the original pm2 execution error
                stdout = stripAnsi(e.stdout || 'No stdout available');
                stderr = stripAnsi(e.stderr || e.message) + '\n\nFallback error: ' + fallbackErr.message;
            }
        }

        return {
            appName,
            store: getContentStore(),
            logs: { stdout, stderr },
            secretsDump: readSecretsFile(),
            appLogs: logger.getAppLogs(300),
        };
    } catch (e: any) {
        throw error(500, `Failed to retrieve logs: ${e.message}`);
    }
};

function readSecretsFile(): string {
    const secretsPath = '/Users/samuelsampson/Coding/openclaw-blog/.blog-secrets';
    try {
        const raw = readFileSync(secretsPath, 'utf-8');
        return '--- .blog-secrets contents ---\n' + raw;
    } catch {
        return '--- .blog-secrets ---\nFile not found at ' + secretsPath;
    }
}
