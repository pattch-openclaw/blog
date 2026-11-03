/**
 * Depth-first walk over a marked token tree (pre-order: a token is visited
 * before its children).
 *
 * marked's own `walkTokens` hook only hands each token to us in isolation, so
 * anything that needs parent/child context — "is this image inside an
 * author-written link?" — has to do its own descent. The token shape is
 * deliberately loosely typed: marked's `Tokens.Generic` exposes child tokens as
 * an optional `tokens` array on every container type, and callers match on
 * `type` themselves.
 */
import type { Tokens } from 'marked';

export function walkTokenTree(tokens: unknown[], visit: (token: Tokens.Generic) => void): void {
	for (const raw of tokens) {
		if (!raw || typeof raw !== 'object') continue;
		const token = raw as Tokens.Generic;
		visit(token);
		if (Array.isArray(token.tokens)) walkTokenTree(token.tokens, visit);
	}
}
