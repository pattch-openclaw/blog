import { expect, test, describe } from 'vitest';
import {
	sanitizeMediaFolder,
	dirOf,
	baseOf,
	bucketRelPath,
	buildFolderTree,
} from './media-paths';

describe('sanitizeMediaFolder', () => {
	test('keeps plain folder paths', () => {
		expect(sanitizeMediaFolder('trips/2026')).toBe('trips/2026');
	});

	test('strips leading/trailing slashes and empty segments', () => {
		expect(sanitizeMediaFolder('/trips/2026/')).toBe('trips/2026');
		expect(sanitizeMediaFolder('trips//2026')).toBe('trips/2026');
	});

	test('resolves traversal segments without escaping the root', () => {
		expect(sanitizeMediaFolder('../evil')).toBe('evil');
		expect(sanitizeMediaFolder('a/../b')).toBe('b');
		expect(sanitizeMediaFolder('a/b/../c')).toBe('a/c');
		expect(sanitizeMediaFolder('..')).toBe('');
		expect(sanitizeMediaFolder('./x')).toBe('x');
	});

	test('sanitizes characters per segment', () => {
		expect(sanitizeMediaFolder('my trips/a b!')).toBe('my_trips/a_b_');
	});

	test('empty stays empty (bucket root)', () => {
		expect(sanitizeMediaFolder('')).toBe('');
		expect(sanitizeMediaFolder('   /  ')).toBe('');
	});
});

describe('path helpers', () => {
	test('dirOf / baseOf', () => {
		expect(dirOf('trips/2026/x.png')).toBe('trips/2026');
		expect(dirOf('x.png')).toBe('');
		expect(baseOf('trips/2026/x.png')).toBe('x.png');
		expect(baseOf('x.png')).toBe('x.png');
	});

	test('bucketRelPath normalizes both store path shapes', () => {
		expect(bucketRelPath('images/trips/x.png', 'images')).toBe('trips/x.png');
		expect(bucketRelPath('media/images/trips/x.png', 'images')).toBe('trips/x.png');
		expect(bucketRelPath('x.png', 'images')).toBe('x.png');
		expect(bucketRelPath('media/images/x.png', 'images')).toBe('x.png');
	});
});

describe('buildFolderTree', () => {
	test('groups root-level files under the root node', () => {
		const tree = buildFolderTree(['a.png', 'b.png']);
		expect(tree.dir).toBe('');
		expect(tree.files).toEqual(['a.png', 'b.png']);
		expect(tree.folders).toHaveLength(0);
		expect(tree.total).toBe(2);
	});

	test('splits nested paths into folder nodes with recursive totals', () => {
		const tree = buildFolderTree([
			'root.png',
			'trips/2026/beach.png',
			'trips/2026/sunset.png',
			'trips/2025/ski.jpg',
			'work/diagram.png',
		]);

		expect(tree.files).toEqual(['root.png']);
		expect(tree.folders.map((f) => f.name)).toEqual(['trips', 'work']);
		expect(tree.total).toBe(5);

		const trips = tree.folders.find((f) => f.name === 'trips')!;
		expect(trips.dir).toBe('trips');
		expect(trips.files).toEqual([]); // folders-only parent still renders
		expect(trips.total).toBe(3);
		expect(trips.folders.map((f) => f.name)).toEqual(['2025', '2026']);

		const y2026 = trips.folders.find((f) => f.name === '2026')!;
		expect(y2026.files).toEqual(['trips/2026/beach.png', 'trips/2026/sunset.png']); // full rel paths, sorted by basename
		expect(y2026.total).toBe(2);
	});

	test('dedupes shared folder nodes across files', () => {
		const tree = buildFolderTree(['a/1.png', 'a/2.png', 'a/b/3.png']);
		const a = tree.folders.find((f) => f.name === 'a')!;
		expect(a.files).toEqual(['a/1.png', 'a/2.png']);
		expect(a.folders.map((f) => f.name)).toEqual(['b']);
		expect(a.total).toBe(3);
	});

	test('empty input yields empty root', () => {
		const tree = buildFolderTree([]);
		expect(tree.files).toEqual([]);
		expect(tree.folders).toEqual([]);
		expect(tree.total).toBe(0);
	});
});
