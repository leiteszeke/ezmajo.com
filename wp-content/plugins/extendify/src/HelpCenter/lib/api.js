import { AI_HOST } from '@constants';
import { useAIConsentStore } from '@shared/state/ai-consent';

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

export const getAnswer = ({ question, experienceLevel }) =>
	fetch(`${AI_HOST}/api/chat/ask-question`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ question, experienceLevel, ...extraBody }),
	});

export const rateAnswer = ({ answerId, rating }) =>
	fetch(`${AI_HOST}/api/chat/rate-answer`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ answerId, rating }),
	});
