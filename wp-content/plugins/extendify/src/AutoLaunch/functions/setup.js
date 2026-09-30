import apiFetch from '@wordpress/api-fetch';

export const prefetchAssistData = async () =>
	await apiFetch({ path: 'extendify/v1/auto-launch/prefetch-assist-data' });

export const postLaunchFunctions = () =>
	apiFetch({
		path: '/extendify/v1/auto-launch/post-launch-functions',
		method: 'POST',
	});

export const preLaunchFunctions = () =>
	apiFetch({
		path: '/extendify/v1/auto-launch/pre-launch-functions',
		method: 'POST',
	});

export const resetLaunchState = () =>
	apiFetch({
		path: '/extendify/v1/auto-launch/reset-launch-state',
		method: 'POST',
	});

export const runUpdates = () =>
	apiFetch({
		path: '/extendify/v1/auto-launch/run-updates',
		method: 'POST',
	});

export const forceReinstallPlugin = (slug) =>
	apiFetch({
		path: '/wp/v2/plugins',
		method: 'POST',
		headers: { 'X-Extendify-Force-Reinstall': '1' },
		data: { slug },
	});
