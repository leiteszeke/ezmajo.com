import { getStringsShape } from '@auto-launch/fetchers/shape';
import {
	failWithFallback,
	fetchWithTimeout,
	retryTwice,
	setStatus,
} from '@auto-launch/functions/helpers';
import { launchStrings } from '@auto-launch/strings';
import { AI_HOST } from '@constants';
import { reqDataBasics } from '@shared/lib/data';

const fallback = { aiHeaders: [], aiBlogTitles: [], heroDescription: '' };
const url = `${AI_HOST}/api/site-strings`;
const method = 'POST';
const headers = { 'Content-Type': 'application/json' };

export const handleSiteStrings = async ({ siteProfile }) => {
	// translators: this is for a action log UI. Keep it short
	setStatus(launchStrings().statusIdeas);

	const body = JSON.stringify({ ...reqDataBasics, siteProfile });

	const response = await retryTwice(() =>
		fetchWithTimeout(url, { method, headers, body }),
	);

	if (!response?.ok) return fallback;

	return failWithFallback(
		async () => getStringsShape.parse(await response.json()),
		fallback,
		{ caller: 'handleSiteStrings' },
	);
};
