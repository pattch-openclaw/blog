import { expect, test, describe, vi } from 'vitest';
import { actions } from './+page.server';

// Mock the dependencies
const mockDeletePost = vi.fn();
const mockUpdatePost = vi.fn();
const mockGetWriteStore = vi.fn();

vi.mock('$lib/server/posts', () => ({
	getWriteStore: () => mockGetWriteStore(),
}));

vi.mock('$lib/logging', () => ({
	logger: {
		info: vi.fn(),
		error: vi.fn(),
	},
}));

describe('admin delete action', () => {
	test('returns success when deletePost succeeds', async () => {
		mockGetWriteStore.mockResolvedValue({
			deletePost: mockDeletePost.mockResolvedValue(undefined),
		});

		const formData = new FormData();
		formData.set('slug', 'test-post');

		const result = await actions.delete({ request: { formData: () => formData } } as any);

		expect(result).toEqual({ success: true, action: 'deleted' });
		expect(mockDeletePost).toHaveBeenCalledWith('test-post');
	});

	test('returns 400 error when slug is missing', async () => {
		mockGetWriteStore.mockResolvedValue({
			deletePost: mockDeletePost.mockResolvedValue(undefined),
		});

		const formData = new FormData();

		const result = await actions.delete({ request: { formData: () => formData } } as any);

		expect(result.status).toBe(400);
		expect(result.data?.error).toBe('Missing slug');
	});

	test('returns 500 error when deletePost throws', async () => {
		mockGetWriteStore.mockResolvedValue({
			deletePost: mockDeletePost.mockRejectedValue(new Error('Supabase error')),
		});

		const formData = new FormData();
		formData.set('slug', 'test-post');

		const result = await actions.delete({ request: { formData: () => formData } } as any);

		expect(result.status).toBe(500);
		expect(result.data?.error).toContain('Failed to delete post');
	});
});
