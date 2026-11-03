/**
 * Generic block-level directive support for markdown content.
 *
 * Syntax (the de facto markdown "container directive" convention):
 *
 *     :::gallery
 *     ![alt](https://example.com/a.png)
 *     ![alt](https://example.com/b.png)
 *     :::
 *
 * A directive is a block-level `:::name ... :::` fence. The tokenizer emits a
 * token; the renderer dispatches on `name` via the `directiveRenderers`
 * registry. Adding a new directive (:::carousel, :::table, ...) means adding
 * one renderer here (and optionally one click handler in ./client.ts) — no
 * other plumbing.
 *
 * Notes:
 * - Unclosed directives do NOT match tokenization and fall through to normal
 *   markdown rendering, so a stray `:::gallery` degrades to plain text.
 * - Fences (``` blocks) are untouched: marked's code block token wins first.
 * - Supabase signed-URL replacement runs on the raw markdown string before
 *   parsing, so image URLs inside directive bodies are replaced as usual.
 */
import { Marked, marked, type Tokens } from 'marked';
import { renderGallery } from './gallery';
import { escapeAttr, fullSizeLink } from './html';
import { walkTokenTree } from './token-tree';
import { withImageKitTransform, fullSizeUrl, POST_IMAGE_TRANSFORM } from '../image-urls';

/** Renderer for one directive's body. Must return complete static HTML. */
export type DirectiveRenderer = (body: string) => string;

/**
 * Directive registry — the single place to add new directives.
 */
export const directiveRenderers: Record<string, DirectiveRenderer> = {
	gallery: renderGallery
};

interface DirectiveToken extends Tokens.Generic {
	type: 'directive';
	name: string;
	body: string;
}

/** Matches `:::name\n<body>\n:::` as a complete block. */
const DIRECTIVE_RE = /^:::[ \t]*([a-zA-Z][\w-]*)[ \t]*\r?\n([\s\S]*?)\r?\n:::[ \t]*(?=\r?\n|$)/;

export const directiveExtension = {
	name: 'directive',
	level: 'block' as const,
	start(src: string): number {
		const idx = src.indexOf(':::');
		return idx === -1 ? Infinity : idx;
	},
	tokenizer(src: string): DirectiveToken | undefined {
		const match = DIRECTIVE_RE.exec(src);
		if (!match) return undefined;
		return { type: 'directive', raw: match[0], name: match[1], body: match[2] };
	},
	/**
	 * Render a directive token. Unknown directive names degrade gracefully:
	 * the body is rendered as plain markdown inside a wrapper div.
	 */
	renderer(token: Tokens.Generic): string {
		const { name, body } = token as DirectiveToken;
		const render = directiveRenderers[name];
		if (render) return render(body);
		return `<div class="directive directive-unknown" data-directive="${name}">${renderFallback(body)}</div>`;
	}
};

/** Fallback for unknown directives: render the body as normal markdown. */
function renderFallback(body: string): string {
	return String(marked.parse(body)).trim();
}

/**
 * Dedicated configured Marked instance for post content.
 * Do not reuse the global `marked` singleton — this instance owns the
 * directive extension and keeps rendering deterministic.
 */
const postMarked = new Marked();
postMarked.use({
	extensions: [directiveExtension],
	/**
	 * Tag images that sit inside a link so the image renderer can leave them
	 * alone. marked walks the whole token tree before rendering any of it, and
	 * descends parent-before-child, but walking the link's own subtree keeps the
	 * flag independent of that visit order.
	 */
	walkTokens(token) {
		const link = token as Tokens.Generic;
		if (link.type !== 'link' || !Array.isArray(link.tokens)) return;
		walkTokenTree(link.tokens, (child) => {
			if (child.type === 'image') (child as ImageToken).inAuthorLink = true;
		});
	},
	/**
	 * Post-body (non-gallery) images: rendered at post width and linked to the
	 * full-size variant. Directive bodies are raw strings on their token, so
	 * gallery images never reach this renderer — the gallery renderer applies its
	 * own per-role transforms (main w-1200 / thumb w-300,h-300 / full-size
	 * link). Transforms are no-ops for non-ImageKit URLs (git /media paths,
	 * external images), which therefore link to their own original file.
	 */
	renderer: {
		image(token) {
			const img = token as ImageToken;
			if (typeof img.href !== 'string' || img.href === '') return false;
			const attrs = [
				`src="${escapeAttr(withImageKitTransform(img.href, POST_IMAGE_TRANSFORM))}"`,
				`alt="${escapeAttr(img.text ?? '')}"`,
				'loading="lazy"'
			];
			if (img.title) attrs.push(`title="${escapeAttr(img.title)}"`);
			const imageHtml = `<img ${attrs.join(' ')}>`;
			return img.inAuthorLink ? imageHtml : fullSizeLink(imageHtml, fullSizeUrl(img.href));
		}
	}
});

/**
 * Post-body image markup: rendered at post width and wrapped in a link to the
 * full-size variant, so clicking an image opens it at full resolution in a new
 * tab (see `fullSizeLink` / `POST_IMAGE_TRANSFORM` / `FULL_IMAGE_TRANSFORM`).
 *
 * marked hands renderers a token with no parent context, so an image the author
 * wrapped in their own link (`[![alt](img.png)](https://…)` ) is tagged by
 * `walkTokens` before any rendering happens; the image renderer then emits the
 * bare `<img>` so the author's link target wins and anchors never nest.
 */
type ImageToken = Tokens.Image & { inAuthorLink?: true };

/** Parse blog post markdown (with directive support) into HTML. */
export function parsePostContent(markdown: string): string {
	return String(postMarked.parse(markdown));
}
