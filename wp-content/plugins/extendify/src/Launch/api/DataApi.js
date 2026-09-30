import { AI_HOST, IMAGES_HOST, PATTERNS_HOST } from '@constants';
import { getHeadersAndFooters } from '@launch/api/WPApi';
import { useUserSelectionStore } from '@launch/state/user-selections';
import { formatSiteQuestionsForAPI } from '@shared/utils/format-site-questions-for-api';

// Optionally add items to request body
const allowList = [
	'partnerId',
	'devbuild',
	'version',
	'siteId',
	'wpLanguage',
	'wpVersion',
	'siteProfile',
];

const extraBody = {
	...Object.fromEntries(
		Object.entries(window.extSharedData).filter(([key]) =>
			allowList.includes(key),
		),
	),
};

const fetchTemplates = async (type, siteType, otherData = {}) => {
	const { showLocalizedCopy } = window.extSharedData;
	const otherDataProcessed = Object.entries(otherData).reduce(
		(acc, [key, value]) => {
			if (value == null) return acc;
			acc[key] = typeof value === 'object' ? JSON.stringify(value) : value;
			return acc;
		},
		{},
	);

	const res = await fetch(`${PATTERNS_HOST}/api/${type}-templates`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			...extraBody,
			siteType: siteType?.slug,
			showLocalizedCopy: !!showLocalizedCopy,
			...otherDataProcessed,
		}),
	});

	if (!res.ok) throw new Error('Bad response from server');

	return await res.json();
};

export const getHomeTemplates = async ({
	siteType,
	siteStructure,
	siteProfile,
	siteStrings,
	siteImages,
	siteStyles,
	siteObjective,
	siteQuestions = [],
	sitePlugins = [],
}) => {
	const styles = await fetchTemplates('home', siteType, {
		siteStructure,
		siteProfile,
		siteStrings,
		siteImages,
		siteStyles,
		siteObjective,
		siteQuestions,
		sitePlugins,
	});
	const { wpLanguage, showImprint } = window.extSharedData || {};

	// Check if we should show footer navigation
	// This is based on the imprint page and the language of the site
	const hasFooterNav = Array.isArray(showImprint)
		? showImprint.includes(wpLanguage ?? '') &&
			siteProfile?.aiSiteCategory === 'Business'
		: false;

	const { headers, footers } = await getHeadersAndFooters(hasFooterNav);
	if (!styles?.length) {
		throw new Error('Could not get styles');
	}
	return styles.map((template, index) => {
		// Cycle through the headers and footers
		const header = headers[index % headers.length];
		const footer = footers[index % footers.length];
		return {
			...template,
			headerCode: header?.content?.raw?.trim() ?? '',
			footerCode: footer?.content?.raw?.trim() ?? '',
		};
	});
};

export const getPageTemplates = async ({
	siteType,
	siteStructure,
	siteStrings,
	siteImages,
	siteStyle,
	siteQuestions = [],
	sitePlugins = [],
}) => {
	const { siteInformation, siteProfile } = useUserSelectionStore.getState();
	const pages = await fetchTemplates('page', siteType, {
		siteInformation,
		siteStructure,
		siteStrings,
		siteImages,
		siteStyle,
		siteProfile,
		siteQuestions,
		sitePlugins,
	});
	if (!pages?.recommended) {
		throw new Error('Could not get pages');
	}
	return {
		recommended: pages.recommended.map(({ slug, ...rest }) => ({
			...rest,
			slug,
			id: slug,
		})),
		optional: pages.optional.map(({ slug, ...rest }) => ({
			...rest,
			slug,
			id: slug,
		})),
	};
};

export const generateCustomPatterns = async (page, userState, siteProfile) => {
	const res = await fetch(`${AI_HOST}/api/patterns`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			...extraBody,
			page,
			userState,
			siteProfile,
		}),
	});

	if (!res.ok) throw new Error('Bad response from server');
	return await res.json();
};

export const getLinkSuggestions = async (pageContent, availablePages) => {
	const { siteType } = useUserSelectionStore.getState();
	try {
		const res = await fetch(`${AI_HOST}/api/link-pages`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				...extraBody,
				siteType: siteType?.slug,
				pageContent,
				availablePages,
			}),
		});
		if (!res.ok) throw new Error('Bad response from server');
		return await res.json();
	} catch (_error) {
		// fail gracefully
		return {};
	}
};

export const getSiteProfile = async ({ title, description }) => {
	const url = `${AI_HOST}/api/site-profile`;
	const method = 'POST';
	const headers = { 'Content-Type': 'application/json' };
	const body = JSON.stringify({
		...extraBody,
		title,
		description,
	});
	const fallback = {
		aiSiteType: null,
		aiSiteCategory: null,
		aiDescription: null,
		aiKeywords: [],
		logoObjectName: null,
	};
	let response;
	try {
		response = await fetch(url, { method, headers, body });
	} catch (_error) {
		// try one more time
		try {
			response = await fetch(url, { method, headers, body });
		} catch {
			return fallback;
		}
	}

	if (!response?.ok) return fallback;

	try {
		return (await response.json()) || fallback;
	} catch (_error) {
		return fallback;
	}
};

export const getSiteStrings = async (siteProfile) => {
	const url = `${AI_HOST}/api/site-strings`;
	const method = 'POST';
	const headers = { 'Content-Type': 'application/json' };
	const body = JSON.stringify({ ...extraBody, siteProfile });
	const fallback = { aiHeaders: [], aiBlogTitles: [] };
	let response;
	try {
		response = await fetch(url, { method, headers, body });
	} catch (_error) {
		// try one more time
		try {
			response = await fetch(url, { method, headers, body });
		} catch {
			return fallback;
		}
	}
	if (!response?.ok) return fallback;
	let data;
	try {
		data = await response.json();
	} catch (_error) {
		return fallback;
	}
	return data?.aiHeaders ? data : fallback;
};

export const getSiteImages = async (siteProfile) => {
	const { aiSiteType, aiSiteCategory, aiDescription, aiKeywords } = siteProfile;
	const { siteInformation } = useUserSelectionStore.getState();
	const search = new URLSearchParams({
		aiSiteType,
		aiSiteCategory,
		aiDescription,
		aiKeywords,
		...extraBody,
		source: 'launch',
	});
	if (siteInformation?.title) search.append('title', siteInformation.title);
	const url = `${IMAGES_HOST}/api/search?${search}`;
	const method = 'GET';
	const headers = { 'Content-Type': 'application/json' };
	const fallback = { siteImages: [] };
	const requestTimeOut = 10000;

	let response;
	try {
		response = await fetch(url, {
			method,
			headers,
			signal: AbortSignal.timeout(requestTimeOut),
		});
	} catch (_error) {
		// try one more time
		try {
			response = await fetch(url, {
				method,
				headers,
				signal: AbortSignal.timeout(requestTimeOut),
			});
		} catch {
			return fallback;
		}
	}

	if (!response?.ok) return fallback;
	let data;
	try {
		data = await response.json();
	} catch (_error) {
		return fallback;
	}
	return data?.siteImages ? data : fallback;
};

export const getSiteStyles = async ({ title, siteProfile }) => {
	const request = new Request(`${AI_HOST}/api/style-recipes`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ ...extraBody, title, siteProfile }),
	});
	const fallback = [];

	let response;

	try {
		response = await fetch(request);
	} catch (_error) {
		// try one more time
		try {
			response = await fetch(request);
		} catch {
			return fallback;
		}
	}

	if (!response?.ok) {
		return fallback;
	}

	try {
		return await response.json();
	} catch (_) {
		return fallback;
	}
};

export const getSiteLogo = async (objectName) => {
	const url = `${AI_HOST}/api/site-profile/generate-logo`;
	const method = 'POST';
	const headers = { 'Content-Type': 'application/json' };
	const siteId = window.extSharedData?.siteId ?? '';
	const partnerId = window.extSharedData?.partnerId ?? '';
	const showAILogo = window.extSharedData?.showAILogo ?? false;
	const fallback =
		'https://images.extendify-cdn.com/demo-content/logos/ext-custom-logo-default.webp';

	if (!showAILogo || !objectName) {
		return fallback;
	}

	if (!siteId || !partnerId) {
		throw new Error(
			'Missing required parameter (siteId, partnerId or objectName)',
		);
	}

	const body = JSON.stringify({ objectName, siteId, partnerId });

	let response;
	try {
		response = await fetch(url, { method, headers, body });
		if (!response?.ok) throw new Error('Bad response from server');
	} catch (_error) {
		try {
			response = await fetch(url, { method, headers, body });
		} catch {
			return fallback;
		}
	}

	if (!response?.ok) return fallback;

	try {
		const data = await response.json();
		return data?.logoUrl ?? fallback;
	} catch (_error) {
		return fallback;
	}
};

export const getSiteQuestions = async ({ siteProfile }) => {
	const url = `${AI_HOST}/api/site-questions`;
	const method = 'POST';
	const headers = { 'Content-Type': 'application/json' };
	const fallback = { questions: [] };

	if (!siteProfile) {
		return fallback;
	}

	const { wpLanguage } = window.extSharedData;
	const { businessInformation, siteObjective } =
		useUserSelectionStore.getState();
	const body = JSON.stringify({
		...siteProfile,
		description: businessInformation?.description || '',
		siteObjective: siteObjective || '',
		wpLanguage,
		partnerId: extraBody?.partnerId || null,
	});

	let response;
	try {
		response = await fetch(url, { method, headers, body });
		if (!response?.ok) throw new Error('Bad response from server');
	} catch (_error) {
		try {
			response = await fetch(url, { method, headers, body });
		} catch {
			return fallback;
		}
	}

	if (!response?.ok) return fallback;

	try {
		const data = await response.json();
		return data?.questions ?? fallback;
	} catch (_error) {
		return fallback;
	}
};

export const getSitePlugins = async ({ siteProfile, siteQA }) => {
	const url = `${AI_HOST}/api/site-plugins`;
	const method = 'POST';
	const headers = { 'Content-Type': 'application/json' };
	const fallback = [];

	if (!siteProfile) {
		return fallback;
	}

	const { wpLanguage, partnerId, pluginGroupId } = window.extSharedData;
	const { siteObjective } = useUserSelectionStore.getState();

	const body = JSON.stringify({
		...siteProfile,
		siteQuestions: formatSiteQuestionsForAPI(siteQA),
		siteObjective: siteObjective || '',
		wpLanguage,
		partnerId,
		pluginGroupId,
	});

	let response;

	try {
		response = await fetch(url, { method, headers, body });
		if (!response?.ok) throw new Error('Bad response from server');
	} catch (_error) {
		try {
			response = await fetch(url, { method, headers, body });
		} catch {
			return fallback;
		}
	}

	if (!response?.ok) return fallback;

	try {
		const data = await response.json();
		return data?.selectedPlugins ?? fallback;
	} catch (_error) {
		return fallback;
	}
};

export const getImprintPageTemplate = async (siteStyle = {}) => {
	const endpoint = `${PATTERNS_HOST}/api/page-imprint`;

	const res = await fetch(endpoint, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			...extraBody,
			siteStyle: JSON.stringify(siteStyle),
		}),
	});

	if (!res.ok) throw new Error('Could not get imprint page');

	const response = await res.json();

	if (!response?.template) {
		throw new Error('No template found for imprint page');
	}

	return { ...response.template };
};
