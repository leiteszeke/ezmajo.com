import { AI_HOST } from '@constants';
import { reqDataBasics } from '@shared/lib/data';

// ctx, can be any extra data you want to pass to the digest for better insights, e.g. { function: 'handleSiteLogo' }
export const digest = ({ type = 'error', error, details = {} } = {}) => {
	if (Boolean(reqDataBasics?.devbuild) === true) return;

	const extra = {
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
	};

	const errorData = ((e) => {
		if (!e) return { message: 'Unknown error', name: 'Error', stack: '' };
		if (e instanceof Response)
			return {
				message: `HTTP ${e.status}: ${e.statusText}`,
				name: 'FetchError',
				stack: '',
			};
		return {
			message:
				e?.response?.statusText ||
				e?.response?.message ||
				e?.statusText ||
				e?.message ||
				(typeof e === 'string' ? e : 'Unknown error'),
			name: e?.name || 'Error',
		};
	})(error);

	const payload = JSON.stringify({
		...reqDataBasics,
		siteProfile: {
			type: reqDataBasics?.siteProfile?.type,
			title: reqDataBasics?.siteProfile?.title,
			description: reqDataBasics?.siteProfile?.description,
			descriptionRaw: reqDataBasics?.siteProfile?.descriptionRaw,
			objective: reqDataBasics?.siteProfile?.objective,
			category: reqDataBasics?.siteProfile?.category,
			structure: reqDataBasics?.siteProfile?.structure,
			imageSearchTerms: reqDataBasics?.siteProfile?.imageSearchTerms,
		},
		...details,
		error: errorData,
		type,
		extra,
	});

	return fetch(`${AI_HOST}/api/digest`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Accept: 'application/json',
			'X-Extendify': 'true',
		},
		body: payload,
		keepalive: true,
	}).catch(() => {});
};
