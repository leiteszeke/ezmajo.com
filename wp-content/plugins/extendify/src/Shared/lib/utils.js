import { pingServer } from '@shared/api/DataApi';

export const isOnLaunch = () => {
	const q = new URLSearchParams(window.location.search);
	return ['page'].includes(q.get('extendify-launch'));
};

export const deepMerge = (target, ...sources) => {
	return sources.reduce((acc, source) => {
		if (!isObject(acc) || !isObject(source)) {
			return null;
		}

		const newTarget = {};
		for (const k in acc) newTarget[k] = acc[k];

		for (const key in source) {
			if (isObject(source[key]) && key in newTarget) {
				newTarget[key] = deepMerge(newTarget[key], source[key]);
			} else {
				newTarget[key] = source[key];
			}
		}

		return newTarget;
	}, target);
};

export const isObject = (value) => {
	return typeof value === 'object' && !Array.isArray(value) && value !== null;
};

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const wasPluginInstalled = (activePlugins, pluginSlug) =>
	activePlugins?.filter((p) => p.includes(pluginSlug))?.length;

/**
 * Will ping every 1s until we get a 200 response from the server.
 * This is used because we were dealing with a particular issue where
 * servers we're very resource limited and rate limiting was common.
 * */
export const waitFor200Response = async () => {
	try {
		// This will error if not 200
		await pingServer();
		return true;
	} catch (_error) {
		// Do nothing
	}
	await new Promise((resolve) => setTimeout(resolve, 1000));
	return waitFor200Response();
};

export const retryOperation = async (operation, { maxAttempts = 1 }) => {
	for (let attempt = 1; attempt <= maxAttempts; attempt++) {
		try {
			await waitFor200Response();
			await operation();
			break;
		} catch (error) {
			if (attempt === maxAttempts) {
				throw error;
			}
		}
	}
};
