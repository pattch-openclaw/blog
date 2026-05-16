import { error } from '@sveltejs/kit';
import fs from 'node:fs';
import path from 'node:path';

export async function GET({ params }) {
    // Construct safe path
    const basePath = path.resolve('media');
    const filePath = path.resolve(basePath, params.file);

    // Security check: Prevent directory traversal 
    // Ensure the resolved path still lives inside the "media" directory
    if (!filePath.startsWith(basePath)) {
        throw error(403, 'Forbidden');
    }

    if (!fs.existsSync(filePath)) {
        throw error(404, 'Not found');
    }

    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
        throw error(403, 'Forbidden');
    }

    const data = fs.readFileSync(filePath);
    const ext = path.extname(filePath).toLowerCase();
    
    // Map common media extensions to MIME types
    const mimeTypes: Record<string, string> = {
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.gif': 'image/gif',
        '.webp': 'image/webp',
        '.svg': 'image/svg+xml',
        '.mp3': 'audio/mpeg',
        '.wav': 'audio/wav',
        '.mp4': 'video/mp4',
        '.webm': 'video/webm',
        '.woff2': 'font/woff2',
        '.woff': 'font/woff',
        '.ttf': 'font/ttf'
    };

    const contentType = mimeTypes[ext] || 'application/octet-stream';

    return new Response(data, {
        headers: {
            'Content-Type': contentType,
            'Content-Length': stat.size.toString(),
            'Cache-Control': 'public, max-age=31536000'
        }
    });
}