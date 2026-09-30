import { AI_HOST } from '@constants';
import { useAIConsentStore } from '@shared/state/ai-consent';
import { useUnsplashCacheStore } from '@shared/state/unsplash-cache';

const { showAIConsent, userGaveConsent } = useAIConsentStore.getState();

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

const extraBody = {
	...Object.fromEntries(
		Object.entries(window.extSharedData).filter(([key]) =>
			allowList.includes(key),
		),
	),
	showAIConsent,
	userGaveConsent,
};

export const fetchImages = async (search, source = null) => {
	const queryString = new URLSearchParams({
		...extraBody,
		query: search,
		source,
	});

	const res = await fetch(
		`${AI_HOST}/api/draft/image/unsplash?${queryString.toString()}`,
		{
			method: 'GET',
			headers: { 'Content-Type': 'application/json' },
		},
	);

	if (!res.ok) {
		throw new Error('Bad response from server');
	}

	const images = await res.json();

	if (!Array.isArray(images)) {
		throw new Error('Bad response from server');
	}

	const result = images.map((image) => ({
		...image,
		requestMetadata: {
			id: res.headers.get('X-Request-Id'),
			total: res.headers.get('X-Total'),
			perPage: res.headers.get('X-Per-Page'),
		},
	}));

	return result;
};

export const preFetchImages = async () => {
	const cache = useUnsplashCacheStore.getState();
	if (!cache.isEmpty() && !cache.hasExpired()) {
		return cache.images;
	}

	const { imageSearchTerms } = window.extSharedData?.siteProfile ?? {};
	const queries = imageSearchTerms?.length ? imageSearchTerms : [];
	const images = (
		await Promise.all(queries.map((query) => fetchImages(query, 'prefetch')))
	).flat();

	const uniqueImagesMap = images.reduce((acc, image) => {
		if (!acc.has(image.id)) {
			acc.set(image.id, image);
		}
		return acc;
	}, new Map());
	cache.updateCache(Array.from(uniqueImagesMap.values()));

	return images;
};
