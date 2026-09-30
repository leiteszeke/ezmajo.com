// A partner-coloured outline disappears against a background close to it.

const MIN_CONTRAST = 3;

export const MEDIA_RING = '0 0 0 4px rgba(255, 255, 255, 0.2)';

const parseColor = (value = '') => {
	const rgb = value.match(/rgba?\(([^)]+)\)/);
	if (rgb) {
		const parts = rgb[1]
			.split(/[\s,/]+/)
			.filter(Boolean)
			.map(Number);
		const [r, g, b, a = 1] = parts;
		return a === 0 ? null : [r, g, b];
	}
	const hex = value.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
	if (!hex) return null;
	const h =
		hex[1].length === 3
			? hex[1]
					.split('')
					.map((c) => c + c)
					.join('')
			: hex[1];
	return [0, 2, 4].map((i) => Number.parseInt(h.slice(i, i + 2), 16));
};

const luminance = ([r, g, b]) => {
	const channel = (v) => {
		const s = v / 255;
		return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
	};
	return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
};

const contrast = (a, b) => {
	const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
	return (hi + 0.05) / (lo + 0.05);
};

// A photo leaves every ancestor transparent, so there is no colour to judge.
const backdropOf = (el) => {
	let node = el;
	while (node?.nodeType === 1) {
		// A cover paints its image and dim into a child, not itself.
		if (node.classList?.contains('wp-block-cover')) {
			const dim = node.querySelector(':scope > .wp-block-cover__background');
			return dim ? parseColor(getComputedStyle(dim).backgroundColor) : null;
		}
		const color = parseColor(getComputedStyle(node).backgroundColor);
		if (color) return color;
		node = node.parentElement;
	}
	return null;
};

const overMedia = (el) =>
	Boolean(
		el?.closest?.('.wp-block-cover') ||
			el?.matches?.('.wp-block-image, .wp-block-media-text') ||
			el?.querySelector?.('img'),
	);

const decide = (el) => {
	const backdrop = backdropOf(el);
	// A staged section nearly always contains an image somewhere.
	if (!backdrop) return overMedia(el);
	const partner = parseColor(
		getComputedStyle(el).getPropertyValue('--wp--preset--color--primary'),
	);
	if (!partner) return false;
	return contrast(partner, backdrop) < MIN_CONTRAST;
};

// Callers run on scroll; the walk above reads styles up the whole chain.
const decided = new WeakMap();

export const needsContrastRing = (el) => {
	if (!el) return false;
	if (!decided.has(el)) decided.set(el, decide(el));
	return decided.get(el);
};
