import apiFetch from '@wordpress/api-fetch';

export const updateOption = async (option, value) =>
	await apiFetch({
		path: '/extendify/v1/library/settings/single',
		method: 'POST',
		data: { key: option, value },
	});

export const getSiteImages = () =>
	apiFetch({ path: '/extendify/v1/shared/site-images' });
