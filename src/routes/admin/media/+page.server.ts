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
            
            // Push asynchronously so we don't block the UI response while waiting for tests to pass
            // We use setTimeout so the HTTP response finishes before Playwright spins up the browser
            setTimeout(async () => {
                try {
                    await execAsync(`git config user.name "Staging Admin" && git config user.email "admin@staging.local"`);
                    await execAsync(`git commit -m "media: add ${safeFilename}"`);
                    const { stdout, stderr } = await execAsync('git push origin main');
                    console.log('Push stdout:', stdout);
                    console.log('Push stderr:', stderr);
                } catch (err: any) {
                    console.error('Background commit/push failed:', err.message || err);
                    if (err.stdout) console.error('Stdout:', err.stdout);
                    if (err.stderr) console.error('Stderr:', err.stderr);
                }
            }, 100);

            return { 
                success: true, 
                path: `/media/${type}/${safeFilename}`
            };
            
        } catch (e: any) {
            console.error('Upload failed:', e);
            return fail(500, { error: `Upload failed: ${e.message}` });
        }
    }
};