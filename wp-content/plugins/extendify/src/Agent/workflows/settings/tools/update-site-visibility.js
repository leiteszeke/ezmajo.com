import apiFetch from '@wordpress/api-fetch';

const routes = {
	published: '/extendify/v1/site-visibility/publish',
	unpublished: '/extendify/v1/site-visibility/unpublish',
};

export default async ({ visibility }) => {
	const path = routes[visibility];
	if (!path) {
		throw new Error('Visibility not allowed');
	}
	return await apiFetch({ path, method: 'POST' });
};
