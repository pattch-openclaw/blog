/**
 * Client-side behavior for markdown directives.
 *
 * Wiring model (agreed design): one Svelte action (`use:directives`) applied
 * to the container that renders post HTML. The action attaches a single
 * delegated click listener to *that container node* and removes it on
 * destroy — one listener per mounted container regardless of how many
 * directive instances render inside it, and no per-element listeners ever.
 *
 * Event dispatch consults the `directiveHandlers` registry keyed by the
 * `data-directive` attribute. Adding a new interactive directive means adding
 * one entry here (plus its renderer in ./index.ts) — never a new listener.
 *
 * Handlers only ever *change* state; all directives render complete static
 * HTML server-side, so content works fine without JavaScript.
 */

/** Click handler for one directive type. */
export type DirectiveClickHandler = (
	directiveEl: HTMLElement,
	target: HTMLElement,
	event: MouseEvent
) => void;

/** Activate one gallery thumbnail: move `.is-active` and swap the main image. */
function activateGalleryThumb(directiveEl: HTMLElement, thumb: HTMLElement): void {
	const thumbs = Array.from(directiveEl.querySelectorAll<HTMLElement>('.gallery-thumb'));
	const clicked = thumbs.indexOf(thumb);
	if (clicked === -1) return;

	const mainImg = directiveEl.querySelector<HTMLImageElement>('.gallery-main img');

	for (let i = 0; i < thumbs.length; i++) {
		const isActive = i === clicked;
		thumbs[i].classList.toggle('is-active', isActive);
		if (isActive) {
			thumbs[i].setAttribute('aria-current', 'true');
			if (mainImg) {
				const thumbImg = thumbs[i].querySelector('img');
				if (thumbImg) mainImg.src = thumbImg.src;
				mainImg.alt = thumb.dataset.alt ?? '';
			}
		} else {
			thumbs[i].removeAttribute('aria-current');
		}
	}
}

/**
 * Directive handler registry — the single place to add interactive directives.
 * Keyed by the directive's `data-directive` name.
 */
export const directiveHandlers: Record<string, DirectiveClickHandler> = {
	gallery(directiveEl, target) {
		const thumb = target.closest<HTMLElement>('.gallery-thumb');
		// Only thumb clicks do anything; clicks elsewhere in the gallery are inert.
		if (!thumb || thumb.closest('[data-directive]') !== directiveEl) return;
		activateGalleryThumb(directiveEl, thumb);
	}
};

/**
 * Svelte action: attaches one delegated click listener to the container
 * element and dispatches clicks to directive handlers based on the nearest
 * `[data-directive]` ancestor of the click target.
 *
 * Use on any element whose HTML may contain directive output:
 *   <div class="prose" use:directives>{@html contentHtml}</div>
 *
 * Safe with no directives present, and safe if the container's children are
 * replaced (e.g. content re-renders) — the listener lives on the container,
 * not the directive nodes.
 */
export function directives(node: HTMLElement) {
	const onClick = (event: MouseEvent) => {
		const target = event.target instanceof Element ? (event.target as HTMLElement) : null;
		if (!target) return;

		const directiveEl = target.closest<HTMLElement>('[data-directive]');
		// Ignore clicks outside directives, and directives not inside this
		// container (defensive: {@html} regions are opaque to Svelte).
		if (!directiveEl || !node.contains(directiveEl)) return;

		const name = directiveEl.dataset.directive ?? '';
		directiveHandlers[name]?.(directiveEl, target, event);
	};

	node.addEventListener('click', onClick);

	return {
		destroy() {
			node.removeEventListener('click', onClick);
		}
	};
}
