import { AI_HOST } from '@constants';
import { useAIConsentStore } from '@shared/state/ai-consent';
import { useImageGenerationStore } from '@shared/state/generate-images.js';
import { __ } from '@wordpress/i18n';

// Additional data to send with requests
const allowList = [
	'siteId',
	'partnerId',
	'wpVersion',
	'wpLanguage',
	'devbuild',
	'isBlockTheme',
	'userId',
	'siteProfile',
];

const { showAIConsent, userGaveConsent } = useAIConsentStore.getState();

const extraBody = {
	...Object.fromEntries(
		Object.entries(window.extSharedData).filter(([key]) =>
			allowList.includes(key),
		),
	),
	showAIConsent,
	userGaveConsent,
};

export const completion = async (
	prompt,
	promptType,
	systemMessageKey,
	details,
) => {
	const response = await fetch(`${AI_HOST}/api/draft/completion`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			prompt,
			promptType,
			systemMessageKey,
			details,
			globalState: useImageGenerationStore.getState(),
			...extraBody,
		}),
	});

	if (!response.ok) {
		throw new Error(__('Service temporarily unavailable', 'extendify-local'));
	}

	return response;
};
