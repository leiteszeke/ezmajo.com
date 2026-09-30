// A cache key, never a query: resolved to a real term before any request.
export const DEFAULT_IMAGE_SEARCH = 'extendify-default-image-search';

// Page titles measured worse: "About" returns zero photos, and titles are localized.
const NEUTRAL_TERMS = [
	'office workspace',
	'team meeting',
	'city street',
	'modern interior',
	'nature landscape',
];

const pickRandom = (items) => items[Math.floor(Math.random() * items.length)];

export const defaultImageSearch = () => {
	const terms = window.extSharedData?.siteProfile?.imageSearchTerms;
	const usable = Array.isArray(terms)
		? terms.filter((term) => typeof term === 'string' && term.trim())
		: [];
	return usable.length ? pickRandom(usable) : pickRandom(NEUTRAL_TERMS);
};

export const resolveImageSearch = (search) =>
	!search || search === DEFAULT_IMAGE_SEARCH ? defaultImageSearch() : search;
