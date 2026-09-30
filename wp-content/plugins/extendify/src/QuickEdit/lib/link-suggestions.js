// BlockEditorProvider's sub-registry doesn't inherit core's default
// __experimentalFetchLinkSuggestions; pass this in via settings or the
// LinkControl falls back to treating the search term as a literal URL.
import apiFetch from '@wordpress/api-fetch';

export function fetchLinkSuggestions(search, opts = {}) {
	const params = new URLSearchParams();
	params.set('search', search || '');
	params.set('per_page', String(opts.perPage || 10));
	if (opts.type) params.set('type', opts.type);
	if (opts.subtype) params.set('subtype', opts.subtype);
	return apiFetch({ path: `/wp/v2/search?${params.toString()}` }).then(
		(results) =>
			(results || []).map((r) => ({
				id: r.id,
				url: r.url,
				title: r.title || r.url,
				type: r.subtype || r.type,
				kind: r.type,
			})),
	);
}
