/**
 * Extract WordPress-style gettext calls from the Vite IIFE bundle (dist/js/index.js).
 * Rollup renames some helpers (e.g. dashboard `__` → __$1, `t` → t$1); list them here.
 * @see https://github.com/laget-se/react-gettext-parser#configuration-file
 */
module.exports = {
	sourceType: 'script',
	funcArgumentsMap: {
		// __( text, domain ) — @wordpress/i18n in bundle
		__: ['msgid'],
		// Dashboard wrappers (see Rollup output in dist/js/index.js)
		__$1: ['msgid'],
		__$2: ['msgid'],
		_x: ['msgid', 'msgctxt'],
		_n: ['msgid', 'msgid_plural'],
		_nx: ['msgid', 'msgid_plural', null, 'msgctxt'],
		sprintf: ['msgid'],
		sprintf$2: ['msgid'],
		sprintf$3: ['msgid'],
		sprintf$4: ['msgid'],
		sprintfWp: ['msgid'],
		t: ['msgid'],
		t$1: ['msgid'],
	},
};
