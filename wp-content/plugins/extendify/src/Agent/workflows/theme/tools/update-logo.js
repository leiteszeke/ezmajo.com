import apiFetch from '@wordpress/api-fetch';

export default async ({ imageId }) => {
	await apiFetch({
		path: '/wp/v2/settings',
		method: 'POST',
		data: { site_logo: imageId },
	});
};
