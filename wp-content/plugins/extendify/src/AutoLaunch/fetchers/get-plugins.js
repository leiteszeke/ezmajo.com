import { getPluginsShape, pluginShape } from '@auto-launch/fetchers/shape';
import {
	failWithFallback,
	fetchWithTimeout,
	retryTwice,
	setStatus,
} from '@auto-launch/functions/helpers';
import { launchStrings } from '@auto-launch/strings';
import { AI_HOST } from '@constants';
import { digest } from '@shared/api/digest';
import { reqDataBasics } from '@shared/lib/data';
import { z } from 'zod';

const { pluginGroupId } = window.extSharedData;
const fallback = { sitePlugins: [] };
const url = `${AI_HOST}/api/site-plugins`;
const method = 'POST';
const headers = { 'Content-Type': 'application/json' };

const shapeLocal = z.object({
	selectedPlugins: z.array(pluginShape),
});

export const handleSitePlugins = async ({
	siteProfile = {},
	requiredOnly = false,
	showStatus = true,
}) => {
	if (showStatus) {
		// translators: this is for a action log UI. Keep it short
		setStatus(launchStrings().statusPlugins);
	}

	const body = JSON.stringify({
		...reqDataBasics,
		...siteProfile,
		siteProfile,
		siteObjective: siteProfile.objective,
		pluginGroupId,
		requiredOnly,
	});

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
			details: { source: 'auto-launch', caller: 'handleSitePlugins' },
		});
		return fallback;
	}

	const { selectedPlugins } = await failWithFallback(
		async () => shapeLocal.parse(await response.json()),
		fallback,
		{ caller: 'handleSitePlugins' },
	);
	return getPluginsShape.parse({ sitePlugins: selectedPlugins });
};
