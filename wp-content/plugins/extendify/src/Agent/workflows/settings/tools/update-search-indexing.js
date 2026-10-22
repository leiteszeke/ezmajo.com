import apiFetch from '@wordpress/api-fetch';

const routes = {
	enabled: '/extendify/v1/search-indexing/enable',
	disabled: '/extendify/v1/search-indexing/disable',
};

export default async ({ indexing }) => {
	const path = routes[indexing];
	if (!path) {
		throw new Error('Indexing not allowed');
	}
	return await apiFetch({ path, method: 'POST' });
};
