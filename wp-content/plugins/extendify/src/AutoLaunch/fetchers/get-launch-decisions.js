import { getLaunchDecisionsShape } from '@auto-launch/fetchers/shape';
import {
	failWithFallback,
	fetchWithTimeout,
	retryTwice,
} from '@auto-launch/functions/helpers';
import { AI_HOST } from '@constants';
import { digest } from '@shared/api/digest';
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
	).catch((error) => {
		return { ok: false, statusText: error.message, status: 0 };
	});

	if (!response?.ok) {
		digest({
			error: {
				message: response.statusText,
				name: 'FetchError',
				status: response.status,
			},
			details: { source: 'auto-launch', caller: 'handleLaunchDecisions' },
		});
		return fallback;
	}

	return failWithFallback(
		async () => ({
			launchDecisions: getLaunchDecisionsShape.parse(await response.json()),
		}),
		fallback,
	);
};
