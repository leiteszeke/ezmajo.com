const PART_ATTR = 'data-extendify-part';

// A header wearing any of these is positioned by the theme, not inline CSS.
const HEADER_CLASSES = [
	'ext-header-sticky',
	'ext-header-sticky--floating-pill',
	'ext-header-overlay',
	'ext-header-glass',
	'ext-header--dark',
];

const headerBlockEl = () =>
	[...document.querySelectorAll(`[${PART_ATTR}="header"]`)].find(
		(el) => !el.parentElement?.closest(`[${PART_ATTR}="header"]`),
	) ?? null;

export const isExtendableHeader = () => {
	const el = headerBlockEl();
	if (!el) return false;
	const classes = String(el.className).split(/\s+/);
	return HEADER_CLASSES.some((cls) => classes.includes(cls));
};
