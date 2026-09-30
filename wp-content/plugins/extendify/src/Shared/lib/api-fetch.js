import apiFetch from '@wordpress/api-fetch';

// wp/v2 or extendify/v1
const API_NAMESPACE_RE = /^(?:\/)?(?:wp|extendify)\/v\d+(?:\/|$|\?)/i;
apiFetch.use((options, next) => {
	if (!API_NAMESPACE_RE.test(options.path)) {
		return next(options);
	}

	return next({
		...options,
		headers: { ...options?.headers, 'X-Extendify': 'true' },
	});
});
