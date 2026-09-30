import { AI_HOST, INSIGHTS_HOST } from '@constants';
import { reqDataBasics } from '@shared/lib/data';
import { useImageGenerationStore } from '@shared/state/generate-images';
import apiFetch from '@wordpress/api-fetch';
import { __ } from '@wordpress/i18n';

const imageErrorMessage = (status) => {
	if (status === 'content_policy_violation') {
		// translators: shown when the AI image generator refuses a prompt on safety grounds.
		return __(
			'That request was blocked by our safety system. Try a different description.',
			'extendify-local',
		);
	}
	if (status === 'no_image_returned') {
		// translators: shown when the AI image generator returns nothing, cause unknown.
		return __(
			"Couldn't create that image. Try describing it differently.",
			'extendify-local',
		);
	}
	return __('Service temporarily unavailable', 'extendify-local');
};

export const generateImage = async (imageData, signal) => {
	const response = await fetch(`${AI_HOST}/api/draft/image`, {
		method: 'POST',
		mode: 'cors',
		headers: { 'Content-Type': 'application/json' },
		signal: signal,
		body: JSON.stringify({
			...imageData,
			globalState: useImageGenerationStore.getState(),
			...reqDataBasics,
		}),
	});

	const body = await response.json();

	const imageCredits = {
		remaining: response.headers.get('x-ratelimit-remaining'),
		total: response.headers.get('x-ratelimit-limit'),
		refresh: response.headers.get('x-ratelimit-reset'),
	};

	if (!response.ok) {
		throw { message: imageErrorMessage(body.status), imageCredits };
	}
	return {
		images: body,
		imageCredits,
		id: response.headers.get('x-request-id'),
	};
};

export const recordPluginActivity = async ({ slug, source }) => {
	try {
		const res = await fetch(`${INSIGHTS_HOST}/api/v1/plugin-install`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json', 'X-Extendify': 'true' },
			body: JSON.stringify({
				...reqDataBasics,
				slug,
				source,
				siteCreatedAt: window.extSharedData?.siteCreatedAt,
			}),
		});

		// this should not break the app.
		if (!res.ok) {
			console.error('Bad response from server');
			return null;
		}

		return await res.json();
	} catch (error) {
		console.error('Error sending plugin installation notification:', error);
		return null;
	}
};

export const pingServer = async () =>
	await apiFetch({ path: '/extendify/v1/shared/ping' });

export const getPartnerPlugins = async (key) => {
	const plugins = await apiFetch({
		path: '/extendify/v1/shared/partner-plugins',
	});
	if (!Object.keys(plugins?.data ?? {}).length) {
		throw new Error('Could not get plugins');
	}
	if (key && plugins.data?.[key]) {
		return plugins.data[key];
	}
	return plugins.data;
};
