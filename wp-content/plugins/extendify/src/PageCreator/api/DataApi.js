import { AI_HOST, IMAGES_HOST, PATTERNS_HOST } from '@constants';
import { getSiteStyle } from '@page-creator/api/WPApi';
import { useUserStore } from '@page-creator/state/user';

const { siteTitle } = window.extSharedData;
const extraBody = {
	...Object.fromEntries(
		Object.entries(window.extSharedData).filter(([key]) =>
			// Optionally add items to request body
			[
				'partnerId',
				'devbuild',
				'version',
				'siteId',
				'wpLanguage',
				'wpVersion',
				'siteProfile',
			].includes(key),
		),
	),
};

const fetchPageTemplates = async (details = {}) => {
	const { showLocalizedCopy, activePlugins, installedPlugins } =
		window.extSharedData;
	const { allowsInstallingPlugins } = useUserStore.getState();
	const sitePlugins = details?.sitePlugins || [];

	const plugins =
		activePlugins?.map((path) => {
			return path.split('/')[0];
		}) ?? [];

	const data = Object.entries(details).reduce((acc, [key, value]) => {
		if (value === null) return acc;
		acc[key] = typeof value === 'object' ? JSON.stringify(value) : value;
		return acc;
	}, {});

	const res = await fetch(`${PATTERNS_HOST}/api/page-creator`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			...extraBody,
			showLocalizedCopy: !!showLocalizedCopy,
			allowsInstallingPlugins,
			plugins: JSON.stringify(plugins),
			installedPlugins: JSON.stringify(installedPlugins),
			allowedPlugins: JSON.stringify(sitePlugins),
			...data,
		}),
	});

	if (!res.ok) throw new Error('Bad response from server');

	return await res.json();
};

export const getGeneratedPageTemplate = async ({
	pageProfile,
	siteImages,
	sitePlugins,
}) => {
	const siteStyle = await getSiteStyle();

	// we need the new generated AI description from the page profile
	const page = await fetchPageTemplates({
		siteInformation: { title: siteTitle },
		siteImages,
		siteStyle,
		pageProfile,
		sitePlugins,
	});

	if (!page?.template) {
		throw new Error('Could not get page');
	}

	const currentTheme = window.extSharedData?.themeSlug || 'extendable';
	if (currentTheme !== 'extendable') {
		page.template.patterns = page.template.patterns.filter(
			(pattern) => !pattern.patternTypes.includes('page-title'),
		);
	}

	return page;
};

export const generateCustomContent = async ({
	page,
	userState,
	pageProfile,
}) => {
	const res = await fetch(`${AI_HOST}/api/patterns`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			...extraBody,
			page,
			userState,
			siteProfile: pageProfile,
		}),
	});

	if (!res.ok) throw new Error('Bad response from server');
	return await res.json();
};

export const getPageProfile = async ({ description, siteProfile }) => {
	const response = await fetch(`${AI_HOST}/api/page-profile`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			...extraBody,
			siteDescription: siteProfile?.description || '',
			description,
		}),
	});

	if (!response?.ok) {
		throw new Error('Something went wrong while fetching the profile');
	}

	const data = await response.json();
	return data?.aiDescription
		? data
		: {
				aiTitle: null,
				aiPageType: null,
				aiDescription: null,
				aiKeywords: [],
			};
};

export const getPageImages = async ({ pageProfile }) => {
	const { aiDescription, aiKeywords } = pageProfile;
	const search = new URLSearchParams({
		aiDescription,
		aiKeywords,
		...extraBody,
		source: 'page-creator',
	});

	if (siteTitle) search.append('title', siteTitle);

	const response = await fetch(`${IMAGES_HOST}/api/search?${search}`, {
		method: 'GET',
		headers: { 'Content-Type': 'application/json' },
	});

	if (!response?.ok) {
		throw new Error('Something went wrong while fetching the images');
	}

	const data = await response.json();
	return data?.siteImages ? data : { siteImages: [] };
};

export const getSitePlugins = async ({ pageProfile }) => {
	const url = `${AI_HOST}/api/site-plugins`;
	const method = 'POST';
	const headers = { 'Content-Type': 'application/json' };
	const fallback = [];

	if (!pageProfile) {
		return fallback;
	}

	const { wpLanguage, partnerId, pluginGroupId } = window.extSharedData;

	const body = JSON.stringify({
		type: pageProfile?.aiPageType || '',
		description: pageProfile?.aiDescription || '',
		keywords: pageProfile?.aiKeywords || [],
		siteQuestions: [],
		wpLanguage,
		partnerId,
		pluginGroupId,
		source: 'page-creator',
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

export const getImprintPageTemplate = async () => {
	const siteStyle = await getSiteStyle();
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
