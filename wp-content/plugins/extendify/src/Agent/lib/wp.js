import apiFetch from '@wordpress/api-fetch';

export const updateOption = async (option, value) => {
	await apiFetch({
		path: '/extendify/v1/agent/options',
		method: 'post',
		data: { option, value },
	});
};

export const getOption = (option) => {
	const params = new URLSearchParams({ option: String(option) });
	return apiFetch({
		path: `/extendify/v1/agent/options?${params.toString()}`,
		method: 'GET',
	});
};
