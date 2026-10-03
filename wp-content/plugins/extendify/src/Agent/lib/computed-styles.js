// The baseline for relative requests — attributes alone make an unstyled h1 look
// size-less, so "larger" snaps below the theme default.
const ALLOWLIST = [
	'fontSize',
	'lineHeight',
	'fontWeight',
	'fontFamily',
	'fontStyle',
	'letterSpacing',
	'textTransform',
	'textDecoration',
	'color',
	'backgroundColor',
	'borderRadius',
	'borderWidth',
	'borderStyle',
	'borderColor',
	'boxShadow',
	'padding',
	'margin',
	'minHeight',
];

// Every block computes a min-height; only a set one is a size to step from.
const isEmptyValue = (value, prop) =>
	!value ||
	value === 'normal' ||
	value === 'none' ||
	value === 'auto' ||
	(prop === 'minHeight' && value === '0px');

export const readComputedStyles = (el) => {
	if (!el?.ownerDocument?.defaultView) return null;
	const cs = el.ownerDocument.defaultView.getComputedStyle(el);
	const out = {};
	for (const prop of ALLOWLIST) {
		const value = cs[prop];
		if (!isEmptyValue(value, prop)) out[prop] = value;
	}
	return Object.keys(out).length ? out : null;
};
