import apiFetch from '@wordpress/api-fetch';

export default async ({ id, replacements }) =>
	await apiFetch({
		path: `/wp/v2/navigation/${id}`,
		method: 'POST',
		data: {
			content: replacements?.[0]?.updated,
		},
	});
