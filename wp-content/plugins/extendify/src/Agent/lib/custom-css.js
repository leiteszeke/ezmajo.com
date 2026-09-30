// Mirrors WP_Theme_JSON::process_blocks_custom_css — diverge and the preview
// shows an effect the save drops, or hides one it keeps.
const HAS_MARKUP = /<\/?\w/;
const PSEUDO_ELEMENT = /([>+~\s]*::[a-zA-Z-]+)/;

export const processCustomCss = (css, selector) => {
	if (!css || HAS_MARKUP.test(css)) return '';
	return css.split('&').reduce((out, part) => {
		if (!part) return out;
		if (!part.includes('{')) {
			return `${out}:root :where(${selector.trim()}){${part.trim()}}`;
		}
		// A bare } makes make-pot skip the file, dropping the bundle's translations.
		const [nested, declarations, ...rest] = part.replace(/\}/g, '').split('{');
		if (rest.length || declarations === undefined) return out;
		const pseudo = nested.match(PSEUDO_ELEMENT)?.[1] ?? '';
		const bare = pseudo ? nested.replace(pseudo, '') : nested;
		const scoped = bare.startsWith(' ')
			? `${selector} ${bare.trim()}`
			: `${selector}${bare}`;
		return `${out}:root :where(${scoped})${pseudo}{${declarations.trim()}}`;
	}, '');
};
