import { getLaunchDecisionsShape } from '@auto-launch/fetchers/shape';
import {
	failWithFallback,
	fetchWithTimeout,
	retryTwice,
} from '@auto-launch/functions/helpers';
import { AI_HOST } from '@constants';
import { reqDataBasics } from '@shared/lib/data';

const fallback = {
	launchDecisions: { navExtras: 'none', navButtonLabel: '' },
};
const url = `${AI_HOST}/api/launch-decisions`;
const method = 'POST';
const headers = { 'Content-Type': 'application/json' };

export const handleLaunchDecisions = async ({ siteProfile }) => {
	const body = JSON.stringify({ ...reqDataBasics, siteProfile });

	const response = await retryTwice(() =>
		fetchWithTimeout(url, { method, headers, body }),
	);

	if (!response?.ok) return fallback;

	return failWithFallback(
		async () => ({
			launchDecisions: getLaunchDecisionsShape.parse(await response.json()),
		}),
		fallback,
	);
};
