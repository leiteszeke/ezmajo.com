import { useLaunchDataStore } from '@auto-launch/state/launch-data';
import { INSIGHTS_HOST } from '@constants';
import { reqDataBasics } from '@shared/lib/data';
import apiFetch from '@wordpress/api-fetch';

const headers = {
	'Content-type': 'application/json',
	Accept: 'application/json',
	'X-Extendify': 'true',
};

const { urlParams, activeTests } = window.extLaunchData;
export const checkIn = ({
	stage,
	description,
	siteProfile = {},
	sitePlugins = [],
	siteStyle = {},
} = {}) => {
	const { type, category, structure, objective } = siteProfile;
	const { siteId, partnerId, homeUrl, wpLanguage } = reqDataBasics;
	const attempt = useLaunchDataStore.getState()?.attempt || 1;

	const payload = JSON.stringify({
		...reqDataBasics,
		autoLaunch: true,
		stage,
		description,
		attempt,
		activeTests: Object.keys(activeTests ?? {}).length
			? JSON.stringify(activeTests)
			: undefined,
		skippedDescription: Boolean(urlParams?.title || urlParams?.description),
		insightsId: siteId,
		hostpartner: partnerId,
		siteURL: homeUrl,
		language: wpLanguage,
		sitePlugins: sitePlugins?.map((p) => p?.name),
		urlParameters: urlParams,
		siteStyle,
		style: siteStyle?.colorPalette,
		siteProfile,
		siteType: type,
		siteCategory: category,
		siteStructure: structure,
		siteObjective: objective,
		extra: {
			userAgent: window?.navigator?.userAgent,
			vendor: window?.navigator?.vendor || 'unknown',
			platform:
				window?.navigator?.userAgentData?.platform ||
				window?.navigator?.platform ||
				'unknown',
			mobile: window?.navigator?.userAgentData?.mobile,
			width: window.innerWidth,
			height: window.innerHeight,
			screenHeight: window.screen.height,
			screenWidth: window.screen.width,
			orientation: window.screen.orientation?.type,
			touchSupport: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
		},
	});

	return fetch(`${INSIGHTS_HOST}/api/v1/launch`, {
		method: 'POST',
		headers,
		body: payload,
		keepalive: true,
	});
};

const probeFailureReason = async () => {
	try {
		// parse:false so we get the raw Response and can read the HTTP status — the
		// default JSON parse throws `invalid_json` on a blocked API's HTML error page.
		await apiFetch({ path: '/extendify/v1/shared/ping', parse: false });
		return null;
	} catch (error) {
		if (error?.status === 403) return '403';
		if (error?.status === 404) return '404';
		// Any other status means the request reached the REST API and errored
		// upstream (our ping only ever 200s) — reachable, so not "unreachable".
		if (error?.status) return null;
		return 'network';
	}
};

export const reportRestApiStatus = async () => {
	const reason = await probeFailureReason();
	if (!reason) return;
	const { siteId, partnerId, homeUrl, siteCreatedAt } = reqDataBasics;
	return fetch(`${INSIGHTS_HOST}/api/v1/event`, {
		method: 'POST',
		headers,
		body: JSON.stringify({
			insightsId: siteId,
			key: 'rest_api_unreachable',
			payload: { reason },
			partnerId,
			siteURL: homeUrl,
			siteCreatedAt,
		}),
		keepalive: true,
	});
};
