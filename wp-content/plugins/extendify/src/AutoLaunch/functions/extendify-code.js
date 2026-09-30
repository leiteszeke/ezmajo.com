import { fetchWithTimeout } from '@auto-launch/functions/helpers';
import { AI_HOST } from '@constants';
import { reqDataBasics } from '@shared/lib/data';

// Any non-1 answer, bad status, or network failure resolves to 0
export const getExtendifyCodeRecommendation = async (description) => {
	const response = await fetchWithTimeout(
		`${AI_HOST}/api/launch-decisions/code-recommendation`,
		{
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ ...reqDataBasics, description }),
		},
	)
		.then((res) => res.ok && res.json())
		.catch(() => null);
	return response?.recommend === 1 ? 1 : 0;
};

export const buildExtendifyCodeLink = (link, { description, title } = {}) => {
	if (!link) return '';
	const prompt = [title, description]
		.map((part) => part?.trim())
		.filter(Boolean)
		.join(' — ');
	return link.replace(/\{DESCRIPTION\}/g, encodeURIComponent(prompt));
};
