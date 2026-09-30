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
];

const isEmptyValue = (value) =>
	!value || value === 'normal' || value === 'none' || value === 'auto';

export const readComputedStyles = (el) => {
	if (!el?.ownerDocument?.defaultView) return null;
	const cs = el.ownerDocument.defaultView.getComputedStyle(el);
	const out = {};
	for (const prop of ALLOWLIST) {
		const value = cs[prop];
		if (!isEmptyValue(value)) out[prop] = value;
	}
	return Object.keys(out).length ? out : null;
};
