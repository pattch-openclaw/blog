import { fail } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import fs from 'node:fs/promises';
import path from 'node:path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { logger } from '$lib/logging';

const execAsync = promisify(exec);

export const load: PageServerLoad = async () => {
    const mediaDir = path.resolve('media');
    const imageDir = path.join(mediaDir, 'images');
    
    if (!(await fs.stat(imageDir).catch(() => null))) {
        return { images: [] };
    }

    const entries = await fs.readdir(imageDir, { withFileTypes: true }).catch(() => []);
    
    const imageExts = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp']);
    const images = entries
        .filter(f => f.isFile() && imageExts.has(path.extname(f.name).slice(1).toLowerCase()))
        .map(f => ({
            name: f.name,
            path: `/media/images/${f.name}`,
        }))
        .sort((a, b) => b.name.localeCompare(a.name));

    return { images };
};

export const actions = {
    upload: async ({ request }) => {
        const data = await request.formData();
        const type = data.get('type')?.toString();
        const file = data.get('file') as File;
        let safeFilename = 'unknown';

        if (!type || !['images', 'audio', 'fonts'].includes(type)) {
            return fail(400, { error: 'Invalid media type' });
        }

        if (!file || file.size === 0) {
            return fail(400, { error: 'No file uploaded' });
        }

        // Sanitize the filename to prevent path traversal or weird characters
        safeFilename = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
        
        try {
            const mediaDir = path.resolve('media', type);
            const filePath = path.join(mediaDir, safeFilename);

            // Ensure the target directory exists
            await fs.mkdir(mediaDir, { recursive: true });

            // Write the file locally
            const arrayBuffer = await file.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            await fs.writeFile(filePath, buffer);

            logger.info(`Media upload: ${type}/${safeFilename} (${(file.size / 1024).toFixed(1)}KB)`);

            // Commit and push the new file to Git
            const relativePath = `media/${type}/${safeFilename}`;
            await execAsync(`git add "${relativePath}"`);
            
            // Set dummy identity for the runner
            await execAsync(`git config user.name "Staging Admin" && git config user.email "admin@staging.local"`);
            
            // Commit the file (with --no-verify to skip Husky hooks)
            let commitStdout = '';
            let commitStderr = '';
            try {
                const commitResult = await execAsync(`git commit --no-verify -m "media: add ${safeFilename}"`);
                commitStdout = commitResult.stdout;
                commitStderr = commitResult.stderr;
            } catch (commitErr: any) {
                if (commitErr.stdout && commitErr.stdout.includes('nothing to commit')) {
                    commitStdout = commitErr.stdout;
                    console.log('File already committed or nothing to commit. Proceeding to push.');
                } else {
                    throw commitErr;
                }
            }
            
            // Push to remote
            const pushResult = await execAsync('git push --no-verify origin main');

            logger.info(`Media upload committed: ${safeFilename}`);
            logger.info(`Media upload pushed: ${safeFilename}`);
            return { 
                success: true, 
                path: `/media/${type}/${safeFilename}`,
                gitOutput: {
                    commitStdout,
                    commitStderr,
                    pushStdout: pushResult.stdout,
                    pushStderr: pushResult.stderr
                }
            };
        } catch (e: any) {
            logger.error(`Media upload failed: ${safeFilename}`, e);
            return fail(500, { 
                error: `Upload or Git sync failed`,
                details: e.stack || e.message,
                stdout: e.stdout,
                stderr: e.stderr
            });
        }
    },

    delete: async ({ request }) => {
        const data = await request.formData();
        const filePath = data.get('path')?.toString();

        if (!filePath) {
            return fail(400, { error: 'Missing file path' });
        }

        // Only allow image deletions for now
        if (!filePath.startsWith('/media/images/')) {
            return fail(400, { error: 'Only image deletions are supported' });
        }

        const filename = filePath.split('/').pop()!;
        const mediaDir = path.resolve('media', 'images');
        const localPath = path.join(mediaDir, filename);

        // Verify the file actually exists
        if (!(await fs.stat(localPath).catch(() => null))) {
            return fail(404, { error: 'File not found' });
        }

        try {
            // Delete the file
            await fs.unlink(localPath);
            logger.info(`Media delete: ${filename}`);

            // Set git identity
            await execAsync(`git config user.name "Staging Admin" && git config user.email "admin@staging.local"`);

            // Remove from git index
            const relativePath = `media/images/${filename}`;
            await execAsync(`git rm --cached "${relativePath}"`);
            
            // Commit the deletion
            let commitStdout = '';
            let commitStderr = '';
            try {
                const commitResult = await execAsync(`git commit --no-verify -m "media: delete ${filename}"`);
                commitStdout = commitResult.stdout;
                commitStderr = commitResult.stderr;
            } catch (commitErr: any) {
                if (commitErr.stdout && commitErr.stdout.includes('nothing to commit')) {
                    commitStdout = commitErr.stdout;
                } else {
                    throw commitErr;
                }
            }
            
            // Push to remote
            const pushResult = await execAsync('git push --no-verify origin main');

            return { 
                success: true, 
                deletedPath: filePath,
                gitOutput: {
                    commitStdout,
                    commitStderr,
                    pushStdout: pushResult.stdout,
                    pushStderr: pushResult.stderr
                }
            };
        } catch (e: any) {
            logger.error(`Media delete failed: ${filename}`, e);
            return fail(500, { 
                error: `Delete or Git sync failed`,
                details: e.stack || e.message,
                stdout: e.stdout,
                stderr: e.stderr
            });
        }
    }
};
