import themeVariablesMapping from '@page-creator/_data/theme-variables.json';

const DEFAULT_THEME = 'extendable';
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const buildColorReplacements = (slugs = {}) => {
	const out = {};
	Object.entries(slugs).forEach(([from, to]) => {
		out[`"backgroundColor":"${from}"`] = `"backgroundColor":"${to}"`;
		out[`"textColor":"${from}"`] = `"textColor":"${to}"`;
		out[`"linkColor":"${from}"`] = `"linkColor":"${to}"`;

		out[`has-${from}-background-color`] = `has-${to}-background-color`;
		out[`has-${from}-color`] = `has-${to}-color`;
		out[`has-${from}-link-color`] = `has-${to}-link-color`;

		out[`var:preset|color|${from}`] = `var:preset|color|${to}`;
		out[`var(--wp--preset--color--${from})`] =
			`var(--wp--preset--color--${to})`;
	});
	return out;
};

const buildSpacingReplacements = (scale = {}) => {
	const out = {};
	Object.entries(scale).forEach(([from, to]) => {
		const toVar = to.startsWith('min(') ? to : `var:preset|spacing|${to}`;
		const toCss = to.startsWith('min(')
			? to
			: `var(--wp--preset--spacing--${to})`;
		out[`var:preset|spacing|${from}`] = toVar;
		out[`var(--wp--preset--spacing--${from})`] = toCss;
	});
	return out;
};

const buildFontSizeReplacements = (scale = {}) => {
	const out = {};
	Object.entries(scale).forEach(([from, to]) => {
		out[`"fontSize":"${from}"`] = `"fontSize":"${to}"`;
		out[`has-${from}-font-size`] = `has-${to}-font-size`;
	});
	return out;
};

export function replaceThemeVariables(code = '', themeSlug = DEFAULT_THEME) {
	if (!code || themeSlug === DEFAULT_THEME) return code;

	const theme = themeVariablesMapping[themeSlug];
	if (!theme) return code;

	const map = {
		...buildColorReplacements(theme.colorSlugs),
		...buildSpacingReplacements(theme.spacingScale),
		...buildFontSizeReplacements(theme.fontSizeScale),
	};

	// Kadence has a different color palette string and slug format and we need to remove the dash from the color variables
	if (themeSlug === 'kadence') {
		Object.keys(map).forEach((key) => {
			if (
				(key.startsWith('"backgroundColor":') ||
					key.startsWith('"textColor":') ||
					key.startsWith('"linkColor":')) &&
				map[key].includes('theme-palette-')
			) {
				map[key] = map[key].replace(/theme-palette-(\d+)/, 'theme-palette$1');
			}
		});
	}

	if (!Object.keys(map).length) return code;

	const pattern = new RegExp(Object.keys(map).map(esc).join('|'), 'g');
	return code.replace(pattern, (m) => map[m] ?? m);
}
