import { patchVariantClasses } from '@shared/lib/variant-classes';

const POST_ATTR = 'data-extendify-agent-block-id';
const PART_ATTR = 'data-extendify-part-block-id';
const PRODUCT_ID_ATTR = 'data-extendify-quick-edit-product-id';
const PRODUCT_FIELD_ATTR = 'data-extendify-quick-edit-product-field';
const NAV_REF_ATTR = 'data-extendify-quick-edit-nav-ref';
const NAV_ITEM_INDEX_ATTR = 'data-extendify-quick-edit-nav-item-index';
const WPFORM_ID_ATTR = 'data-extendify-quick-edit-wpform-id';
const WPFORM_FIELD_ID_ATTR = 'data-extendify-quick-edit-wpform-field-id';
const MEDIATEXT_MEDIA_ATTR = 'data-extendify-quick-edit-mediatext-media';

const findWpFormId = (el) => {
	let n = el.parentElement;
	while (n) {
		const fid = n.getAttribute?.(WPFORM_ID_ATTR);
		if (fid) return Number(fid);
		n = n.parentElement;
	}
	return null;
};

// Returns null for inline navigations (items as innerBlocks of the parent
// post/template-part); only ref-based navs (separate wp_navigation CPT) match.
const findNavContext = (el) => {
	const itemIndexStr = el.getAttribute(NAV_ITEM_INDEX_ATTR);
	if (itemIndexStr === null) return null;
	let n = el.parentElement;
	while (n) {
		const ref = n.getAttribute?.(NAV_REF_ATTR);
		if (ref) {
			return {
				navPostId: Number(ref),
				itemIndex: Number(itemIndexStr),
			};
		}
		n = n.parentElement;
	}
	return null;
};

const DYNAMIC_BASES = ['is-style-ext-preset', 'is-style-outline'];

export const resolveTarget = (node) => {
	let el = node;
	while (el && el.nodeType === 1) {
		// WPForms fields and products both take priority over the block-id
		// walk — their tagged elements also carry the agent's block-id and
		// would otherwise resolve to the wrong handler.
		const wpfFieldId = el.getAttribute(WPFORM_FIELD_ID_ATTR);
		if (wpfFieldId) {
			const formId = findWpFormId(el);
			if (formId) {
				return {
					el,
					blockType: 'wpforms:field',
					formId,
					fieldId: Number(wpfFieldId),
					source: {
						kind: 'wpforms',
						formId,
						fieldId: Number(wpfFieldId),
					},
				};
			}
		}
		const productId = el.getAttribute(PRODUCT_ID_ATTR);
		const productField = el.getAttribute(PRODUCT_FIELD_ATTR);
		if (productId && productField) {
			return {
				el,
				productId: Number(productId),
				productField,
				// `product:<field>` keeps the synthetic blockType out of the core/* namespace.
				blockType: `product:${productField}`,
				source: { kind: 'product', id: Number(productId) },
			};
		}
		// media-text's image is a block attribute, not a child block, so its
		// <figure> is tagged on its own (MediaTextTagger). The figure sits
		// INSIDE the wrapper that carries the block id — resolve up to that
		// wrapper for the save, but keep the figure as `mediaEl` for the
		// picker's read + positioning. blockName is the real save target;
		// blockType stays synthetic so the picker gate routes it to ImagePicker.
		if (el.getAttribute(MEDIATEXT_MEDIA_ATTR)) {
			const wrapper = el.closest(
				`.wp-block-media-text[${POST_ATTR}], .wp-block-media-text[${PART_ATTR}]`,
			);
			if (!wrapper) return null;
			const postId = wrapper.getAttribute(POST_ATTR);
			if (postId) {
				return {
					el: wrapper,
					mediaEl: el,
					blockId: Number(postId),
					blockType: 'core/media-text:image',
					blockName: 'core/media-text',
					source: window.extQuickEditData?.context?.currentSource ?? null,
				};
			}
			const partId = wrapper.getAttribute(PART_ATTR);
			const partSlug = wrapper.getAttribute('data-extendify-part-slug') || '';
			return {
				el: wrapper,
				mediaEl: el,
				blockId: Number(partId),
				blockType: 'core/media-text:image',
				blockName: 'core/media-text',
				source: { kind: 'template-part', partSlug },
			};
		}
		const postId = el.getAttribute(POST_ATTR);
		if (postId) {
			return {
				el,
				blockId: Number(postId),
				blockType: detectBlockType(el),
				source: window.extQuickEditData?.context?.currentSource ?? null,
			};
		}
		const partId = el.getAttribute(PART_ATTR);
		if (partId) {
			const partSlug = el.getAttribute('data-extendify-part-slug') || '';
			const blockType = detectBlockType(el);
			// Ref-based nav items live in a separate wp_navigation post,
			// out of reach of /quick-edit/save's findBlock walk. Route
			// them through /quick-edit/wp-navigation instead. Inline nav
			// items fall through to the standard template-part save path.
			if (
				blockType === 'core/navigation-link' ||
				blockType === 'core/navigation-submenu'
			) {
				const navCtx = findNavContext(el);
				if (navCtx) {
					return {
						el,
						blockType,
						navPostId: navCtx.navPostId,
						itemIndex: navCtx.itemIndex,
						source: {
							kind: 'wp-navigation',
							id: navCtx.navPostId,
							itemIndex: navCtx.itemIndex,
						},
					};
				}
			}
			return {
				el,
				blockId: Number(partId),
				blockType,
				source: { kind: 'template-part', partSlug },
			};
		}
		el = el.parentElement;
	}
	return null;
};

// Dynamic-content / wrapper blocks that don't make sense to surface as
// editable on the front end. detectBlockType returns null when any of
// these classes is present so selection bails before a pill ever renders.
const KNOWN_UNSUPPORTED = new Set([
	'wp-block-post-title',
	'wp-block-post-author',
	'wp-block-post-date',
	'wp-block-post-terms',
	// core/navigation wraps individual links; clicks route to the child link instead.
	'wp-block-navigation',
]);

// Class-name suffixes that look like wp-block-X but aren't a block type
// (BEM children, layout helpers). Excluding them keeps the generic
// "first wp-block-* class wins" derivation from inventing core/foo__bar.
const WP_BLOCK_CLASS_BLOCKLIST = /__|^wp-block-(post|theme|root|preset)-/;

// A third-party block `acme/testimonial` renders as `wp-block-acme-testimonial`,
// structurally indistinguishable from a core slug like `media-text`. Without a
// known-core check, `wp-block-acme-testimonial` would derive the fabricated type
// `core/acme-testimonial` — a lie that can route a click to the wrong editor or
// mislead the server's type guard. So emit `core/<slug>` only for a recognized
// core slug; an unrecognized slug returns null → unsupported (Ask-AI-only),
// which is fail-safe. A core block missing from this list degrades the same way,
// so staleness costs an Ask-AI-only fallback, never a wrong write.
const CORE_BLOCK_SLUGS = new Set([
	'paragraph',
	'heading',
	'list',
	'list-item',
	'quote',
	'pullquote',
	'code',
	'preformatted',
	'verse',
	'details',
	'footnotes',
	'table',
	'table-of-contents',
	'image',
	'gallery',
	'audio',
	'video',
	'file',
	'cover',
	'media-text',
	'embed',
	'buttons',
	'button',
	'columns',
	'column',
	'group',
	'separator',
	'spacer',
	'more',
	'nextpage',
	'social-links',
	'social-link',
	'search',
	'html',
	'shortcode',
	'page-list',
	'page-list-item',
	'navigation-link',
	'navigation-submenu',
	'home-link',
	'loginout',
	'site-logo',
	'site-title',
	'site-tagline',
	'archives',
	'calendar',
	'categories',
	'latest-posts',
	'latest-comments',
	'rss',
	'tag-cloud',
	'avatar',
	'read-more',
	'term-description',
]);

export const detectBlockType = (el) => {
	let firstWpBlockClass = null;
	for (const cls of el.classList) {
		if (KNOWN_UNSUPPORTED.has(cls)) return null;
		if (!firstWpBlockClass && cls.startsWith('wp-block-')) {
			if (!WP_BLOCK_CLASS_BLOCKLIST.test(cls)) firstWpBlockClass = cls;
		}
	}
	// Nav links/submenus render as <li class="wp-block-navigation-item"> and
	// the -link/-submenu classes aren't always present.
	if (
		el.classList.contains('wp-block-navigation-item') ||
		el.classList.contains('wp-block-navigation-link') ||
		el.classList.contains('wp-block-navigation-submenu')
	) {
		return 'core/navigation-link';
	}
	if (firstWpBlockClass) {
		const slug = firstWpBlockClass.slice('wp-block-'.length);
		return CORE_BLOCK_SLUGS.has(slug) ? `core/${slug}` : null;
	}
	// Tag-name fallback for tag-less <p> / <h1-6>. WP usually adds a
	// wp-block-* class, but older themes / hand-authored HTML may not.
	const tag = el.tagName.toLowerCase();
	if (tag === 'p') return 'core/paragraph';
	if (/^h[1-6]$/.test(tag)) return 'core/heading';
	return null;
};

const wpBlockAttributeClasses =
	/^has-([\w-]+-)?(background-color|color|font-size|gradient-background)$|^has-background$|^has-text-color$/;

// Trailing instance number on a block-style-variation class, e.g. the `--3` in
// is-style-ext-preset--button--soft-1--button-1--3.
const variantInstanceClass = /--\d+$/;

// Without this, a save render that omits the numbered instance class silently
// drops the variation's CSS (e.g. a button's preset radius) until a full reload.
const carryVariantInstanceClasses = (liveEl, newEl, bases) => {
	const isInstance = (cls) =>
		variantInstanceClass.test(cls) && bases.some((b) => cls.startsWith(b));

	const instanceByBase = new Map();
	for (const el of [liveEl, ...liveEl.querySelectorAll('*')]) {
		for (const cls of el.classList) {
			if (isInstance(cls)) {
				instanceByBase.set(cls.replace(variantInstanceClass, ''), cls);
			}
		}
	}
	if (!instanceByBase.size) return;

	for (const el of [newEl, ...newEl.querySelectorAll('*')]) {
		const classes = [...el.classList];
		if (classes.some(isInstance)) continue;
		for (const cls of classes) {
			const instance = instanceByBase.get(cls);
			if (instance) el.classList.add(instance);
		}
	}
};

export const splice = (liveEl, renderedHtml) => {
	if (!liveEl || !renderedHtml) return null;

	const patched = patchVariantClasses(
		renderedHtml,
		liveEl.cloneNode(true),
		DYNAMIC_BASES,
	);

	const template = document.createElement('template');
	template.innerHTML = patched || '<div style="display:none"></div>';
	const newEl = template.content.firstElementChild;
	if (!newEl) return null;

	// Carry classes derived from inline attrs.style that don't survive
	// a single-block re-render (text/bg colors, font sizes).
	const newClasses = new Set(newEl.classList);
	liveEl.classList.forEach((cls) => {
		if (newClasses.has(cls)) return;
		if (!wpBlockAttributeClasses.test(cls)) return;
		newEl.classList.add(cls);
	});

	carryVariantInstanceClasses(liveEl, newEl, DYNAMIC_BASES);

	// ext-animate--on starts at opacity:0; theme JS only runs on page
	// load, so a freshly spliced node would be invisible.
	for (const node of [newEl, ...newEl.querySelectorAll('.ext-animate--on')]) {
		node.classList.remove('ext-animate--on');
	}

	// The block is re-rendered in an isolated save scope, so renderedHtml
	// carries that scope's own identity tags (data-extendify-agent-block-id=1).
	// Drop them before carrying the live element's real identity over —
	// otherwise a template-part block, whose live element is tagged only with
	// data-extendify-part-block-id, keeps the stray agent tag too, and
	// resolveTarget (which checks the agent tag before the part tag)
	// resolves the re-edit to the wrong (post) block.
	for (const attr of newEl.getAttributeNames()) {
		if (attr.startsWith('data-extendify-')) newEl.removeAttribute(attr);
	}
	for (const attr of liveEl.getAttributeNames()) {
		if (!attr.startsWith('data-extendify-')) continue;
		newEl.setAttribute(attr, liveEl.getAttribute(attr));
	}

	liveEl.parentNode?.replaceChild(newEl, liveEl);
	return newEl;
};
