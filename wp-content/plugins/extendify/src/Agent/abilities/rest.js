import apiFetch from '@wordpress/api-fetch';

export const query = (args) =>
	new URLSearchParams(
		Object.entries(args).filter(
			([, value]) => value !== undefined && value !== '',
		),
	);

export const restBase = async (path) => {
	const registered = await apiFetch({ path }).catch(() => null);
	return registered?.rest_base;
};
