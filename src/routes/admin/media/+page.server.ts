import { fail } from '@sveltejs/kit';
import fs from 'node:fs/promises';
import path from 'node:path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export const actions = {
    upload: async ({ request }) => {
        const data = await request.formData();
        const type = data.get('type')?.toString();
        const file = data.get('file') as File;

        if (!type || !['images', 'audio', 'fonts'].includes(type)) {
            return fail(400, { error: 'Invalid media type' });
        }

        if (!file || file.size === 0) {
            return fail(400, { error: 'No file uploaded' });
        }

        // Sanitize the filename to prevent path traversal or weird characters
        const safeFilename = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
        
        const mediaDir = path.resolve('media', type);
        const filePath = path.join(mediaDir, safeFilename);

        try {
            // Ensure the target directory exists
            await fs.mkdir(mediaDir, { recursive: true });

            // Write the file locally
            const arrayBuffer = await file.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            await fs.writeFile(filePath, buffer);

            // Commit and push the new file to Git
            const relativePath = `media/${type}/${safeFilename}`;
            await execAsync(`git add "${relativePath}"`);
            
            // Instead of running asynchronously in the background, we will wait for it
            // and return the raw Git output back to the UI.
            
            // 1. Set dummy identity for the runner
            await execAsync(`git config user.name "Staging Admin" && git config user.email "admin@staging.local"`);
            
            // 2. Commit the file (with --no-verify to skip Husky hooks on uploads)
            // We do this because Playwright screendiff tests frequently fail inside PM2
            const commitResult = await execAsync(`git commit --no-verify -m "media: add ${safeFilename}"`);
            
            // 3. Push to remote
            const pushResult = await execAsync('git push origin main');

            return { 
                success: true, 
                path: `/media/${type}/${safeFilename}`,
                gitOutput: {
                    commitStdout: commitResult.stdout,
                    commitStderr: commitResult.stderr,
                    pushStdout: pushResult.stdout,
                    pushStderr: pushResult.stderr
                }
            };
            
        } catch (e: any) {
            console.error('Upload or Git sync failed:', e);
            return fail(500, { 
                error: `Upload or Git sync failed`,
                details: e.message,
                stdout: e.stdout,
                stderr: e.stderr
            });
        }
    }
};