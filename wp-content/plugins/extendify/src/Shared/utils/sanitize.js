export const sanitizeString = (value) => {
	if (!value) return '';

	const DISALLOWED_TAGS = [
		'script',
		'iframe',
		'object',
		'embed',
		'form',
		'meta',
		'link',
		'style',
		'svg',
	];

	const DISALLOWED_PATTERNS = [
		`<\\/*\\s*(${DISALLOWED_TAGS.join('|')})\\b[^>]*>`,
		'javascript:',
		'data:',
	];

	let sanitizedValue = value.trim();

	DISALLOWED_PATTERNS.forEach((pattern) => {
		const patternRegex = new RegExp(pattern, 'gi');
		sanitizedValue = sanitizedValue.replace(patternRegex, '');
	});

	return sanitizedValue;
};
