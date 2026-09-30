import apiFetch from '@wordpress/api-fetch';

// Add required rules here and they will be checked in Launch
// previews and added to Additional CSS
export const requiredCSSVars = {
	'--wp--preset--spacing--30': 'clamp(1.5rem, 5vw, 2rem)',
	'--wp--preset--spacing--40':
		'clamp(1.8rem, 1.8rem + ((1vw - 0.48rem) * 2.885), 3rem)',
	'--wp--preset--spacing--50': 'clamp(2.5rem, 8vw, 4rem)',
	'--wp--preset--spacing--60': 'clamp(2.5rem, 8vw, 6rem)',
	'--wp--preset--spacing--70': 'clamp(3.75rem, 10vw, 7rem)',
	'--wp--preset--spacing--80':
		'clamp(5rem, 5.25rem + ((1vw - 0.48rem) * 9.096), 8rem)',
};

export const addGlobalCSS = async (missingCSSVars) => {
	const id = window.extSharedData.globalStylesPostID;
	const { styles, settings } = await apiFetch({
		path: `/wp/v2/global-styles/${id}`,
	});
	// If any of the rules are already in the CSS, don't add them
	missingCSSVars = missingCSSVars.filter(
		(key) => !styles?.css?.includes(`${key}:`),
	);
	if (!missingCSSVars.length) return;
	const reduced = missingCSSVars.reduce((acc, key) => {
		acc += `${key}: ${requiredCSSVars[key]};\n`;
		return acc;
	}, ':root {\n');
	const missingCSSVarsString = `${reduced}\n}`;
	apiFetch({
		path: `/wp/v2/global-styles/${id}`,
		method: 'PATCH',
		data: {
			id,
			settings,
			styles: {
				...styles,
				css:
					// Preserve the existing css
					(styles?.css ?? '') +
					(styles?.css ? '\n' : '') +
					missingCSSVarsString,
			},
		},
	});
};
