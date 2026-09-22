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
postMarked.use({ extensions: [directiveExtension] });

/** Parse blog post markdown (with directive support) into HTML. */
export function parsePostContent(markdown: string): string {
	return String(postMarked.parse(markdown));
}
