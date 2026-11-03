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
 * HTML server-side, so content works fine without JavaScript. That includes the
 * full-size click-through link the renderers put around images (`fullSizeLink`
 * in ./html.ts): it is a plain anchor the browser follows on its own, no script
 * involved. Handlers that swap an image (gallery thumbnails) are responsible for
 * keeping that link pointed at whatever is currently on screen.
 */

/** Click handler for one directive type. */
export type DirectiveClickHandler = (
	directiveEl: HTMLElement,
	target: HTMLElement,
	event: MouseEvent
) => void;

/**
 * The two URLs one thumbnail implies, decoupled from the DOM so the fallback
 * rules stay unit-testable.
 *
 * The renderer carries both on each thumb (see ./gallery.ts):
 *   data-main-src — post-size variant (w-1200), swapped into the visible viewer
 *   data-full-src — untransformed original, for the click-through link
 *
 * Keeping them apart is the point of the feature: the main viewer must never
 * load the full original (that is the Supabase egress this exists to avoid),
 * and the click-through must never open the w-1200 render. Non-ImageKit markup
 * (git `/media/...`) carries one URL in both attributes, and older markup may
 * carry neither — the thumb's own src is then the only right answer.
 */
export function galleryThumbSources(
	mainSrc: string | undefined,
	fullSrc: string | undefined,
	thumbImgSrc: string
): { mainSrc: string; fullHref: string } {
	const main = mainSrc || thumbImgSrc;
	return { mainSrc: main, fullHref: fullSrc || main };
}

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
				const active = thumbs[i];
				const thumbImg = active.querySelector('img');
				const sources = galleryThumbSources(
					active.dataset.mainSrc,
					active.dataset.fullSrc,
					thumbImg?.src ?? ''
				);
				// The visible viewer always gets the post-size variant — never the
				// full original, and never the w-300 crop the thumb itself shows.
				if (sources.mainSrc) mainImg.src = sources.mainSrc;
				// …and the full-size link wrapped around it follows, so clicking
				// the main image opens what the reader is actually looking at.
				const fullLink = mainImg.closest('a.image-full');
				if (fullLink && sources.fullHref) fullLink.setAttribute('href', sources.fullHref);
				mainImg.alt = active.dataset.alt ?? '';
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
		// Only thumb clicks are handled here. A click on the main image needs
		// nothing from us — the browser follows the full-size link around it, so
		// never call preventDefault(), that would break it. Anywhere else in a
		// gallery is inert.
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
