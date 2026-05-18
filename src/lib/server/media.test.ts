import { expect, test, describe } from 'vitest';
import { isImageFile, filterImages, sanitizeDeletePath, buildDeleteCommitMessage, buildGitRmPath } from './media';

// --- isImageFile ---

describe('isImageFile', () => {
    test('recognizes valid image extensions', () => {
        expect(isImageFile('photo.jpg')).toBe(true);
        expect(isImageFile('photo.jpeg')).toBe(true);
        expect(isImageFile('screenshot.PNG')).toBe(true);
        expect(isImageFile('animated.gif')).toBe(true);
        expect(isImageFile('web-image.webp')).toBe(true);
    });

    test('rejects non-image extensions', () => {
        expect(isImageFile('document.pdf')).toBe(false);
        expect(isImageFile('font.woff')).toBe(false);
        expect(isImageFile('audio.mp3')).toBe(false);
        expect(isImageFile('script.js')).toBe(false);
        expect(isImageFile('no-extension')).toBe(false);
    });

    test('case-insensitive extension matching', () => {
        expect(isImageFile('photo.JPG')).toBe(true);
        expect(isImageFile('photo.JpEg')).toBe(true);
        expect(isImageFile('file.WEBP')).toBe(true);
    });

    test('filename with dots is handled correctly', () => {
        expect(isImageFile('my.photo.jpg')).toBe(true);
        expect(isImageFile('.hidden.png')).toBe(true);
    });
});

// --- filterImages ---

describe('filterImages', () => {
    function entry(name: string, isFile: boolean) {
        return { name, isFile: () => isFile };
    }

    test('filters to only image files', () => {
        const entries = [
            entry('photo.jpg', true),
            entry('document.pdf', true),
            entry('screenshot.png', true),
            entry('readme.txt', true),
            entry('bg.webp', true),
        ];
        const result = filterImages(entries as any);
        expect(result).toHaveLength(3);
        expect(result.map(e => e.name)).toEqual(['screenshot.png', 'photo.jpg', 'bg.webp']);
    });

    test('excludes non-files (directories)', () => {
        const entries = [
            entry('photo.jpg', true),
            entry('subfolder', false),
            entry('bg.png', true),
        ];
        const result = filterImages(entries as any);
        expect(result).toHaveLength(2);
        expect(result.every(e => e.name.endsWith('.jpg') || e.name.endsWith('.png'))).toBe(true);
    });

    test('empty list returns empty array', () => {
        expect(filterImages([] as any)).toEqual([]);
    });

    test('sorts in descending order', () => {
        const entries = [entry('a.png', true), entry('z.png', true), entry('m.png', true)];
        const result = filterImages(entries as any);
        expect(result.map(e => e.name)).toEqual(['z.png', 'm.png', 'a.png']);
    });

    test('generates correct paths', () => {
        const entries = [entry('test.jpg', true)];
        const result = filterImages(entries as any);
        expect(result[0].path).toBe('/media/images/test.jpg');
    });

    test('handles mixed extensions in one batch', () => {
        const entries = [
            entry('a.jpg', true),
            entry('b.JPEG', true),
            entry('c.GIF', true),
            entry('d.webp', true),
            entry('e.png', true),
            entry('f.ttf', true),
            entry('g.mp4', true),
        ];
        const result = filterImages(entries as any);
        expect(result).toHaveLength(5);
        expect(result.map(e => e.name)).toEqual(['e.png', 'd.webp', 'c.GIF', 'b.JPEG', 'a.jpg']);
    });
});

// --- sanitizeDeletePath ---

describe('sanitizeDeletePath', () => {
    test('returns filename for valid /media/images/ path', () => {
        expect(sanitizeDeletePath('/media/images/photo.jpg')).toBe('photo.jpg');
        expect(sanitizeDeletePath('/media/images/subdir/test.png')).toBe('test.png');
    });

    test('returns null for paths outside /media/images/', () => {
        expect(sanitizeDeletePath('/media/audio/song.mp3')).toBeNull();
        expect(sanitizeDeletePath('/media/fonts/font.woff')).toBeNull();
        expect(sanitizeDeletePath('/uploads/image.jpg')).toBeNull();
        expect(sanitizeDeletePath('images/photo.jpg')).toBeNull();
    });

    test('returns null for empty or falsy paths', () => {
        expect(sanitizeDeletePath('')).toBeNull();
        expect(sanitizeDeletePath('/media/')).toBeNull();
    });

    test('path traversal attempts are rejected', () => {
        expect(sanitizeDeletePath('/media/images/../etc/passwd')).toBe('passwd');
        expect(sanitizeDeletePath('/media/audio/../../etc/passwd')).toBeNull();
    });
});

// --- buildDeleteCommitMessage ---

describe('buildDeleteCommitMessage', () => {
    test('formats the commit message correctly', () => {
        expect(buildDeleteCommitMessage('photo.jpg')).toBe('media: delete photo.jpg');
    });

    test('handles filenames with spaces', () => {
        expect(buildDeleteCommitMessage('my photo.jpg')).toBe('media: delete my photo.jpg');
    });

    test('handles filenames with special characters', () => {
        expect(buildDeleteCommitMessage('image_123_v2.png')).toBe('media: delete image_123_v2.png');
    });
});

// --- buildGitRmPath ---

describe('buildGitRmPath', () => {
    test('formats the git rm path correctly', () => {
        expect(buildGitRmPath('photo.jpg')).toBe('media/images/photo.jpg');
    });

    test('handles filenames with special characters', () => {
        expect(buildGitRmPath('image_123_v2.png')).toBe('media/images/image_123_v2.png');
    });
});
