import { error } from '@sveltejs/kit';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export const load = async () => {
    try {
        // Try to read the pm2 logs for the staging environment.
        // We use --nostream to just dump the latest logs and exit.
        // If pm2 is not found globally, we can fallback to reading the default PM2 log files.
        let stdout = '';
        let stderr = '';
        
        try {
            const pm2Result = await execAsync('npx pm2 logs sams-blog-staging --nostream --lines 150');
            stdout = pm2Result.stdout;
            stderr = pm2Result.stderr;
        } catch (e: any) {
            // If pm2 fails, try direct file read from standard PM2 paths as fallback
            const home = process.env.HOME || '/root';
            const pm2OutPath = `${home}/.pm2/logs/sams-blog-staging-out.log`;
            const pm2ErrPath = `${home}/.pm2/logs/sams-blog-staging-error.log`;
            
            try {
                const outRes = await execAsync(`tail -n 100 ${pm2OutPath}`);
                const errRes = await execAsync(`tail -n 100 ${pm2ErrPath}`);
                stdout = "--- OUT LOGS ---\n" + outRes.stdout;
                stderr = "--- ERROR LOGS ---\n" + errRes.stdout;
            } catch (fallbackErr: any) {
                // If even file reading fails, return the original pm2 execution error
                stdout = e.stdout || 'No stdout available';
                stderr = (e.stderr || e.message) + '\n\nFallback error: ' + fallbackErr.message;
            }
        }

        return {
            logs: { stdout, stderr }
        };
    } catch (e: any) {
        throw error(500, `Failed to retrieve logs: ${e.message}`);
    }
};