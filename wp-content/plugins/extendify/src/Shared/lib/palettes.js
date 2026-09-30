import { AI_HOST } from '@constants';

// Unlike getVibes this never throws; a caller falls back on an empty list.
export const getPalettes = async (query = '') => {
	const url = new URL(`${AI_HOST}/api/palettes`);
	if (query) url.searchParams.set('palettes', query);

	const response = await fetch(url, {
		method: 'GET',
		headers: { 'Content-Type': 'application/json' },
	});

	if (!response.ok) return [];

	const { palettes } = await response.json();
	return Array.isArray(palettes) ? palettes : [];
};

// Without the widening, a palette no surface offers drops out of the purge union.
export const getServedPalettes = async (surface, slugs) => {
	const asked = [...new Set([slugs].flat().filter(Boolean))];

	try {
		return await getPalettes([surface, ...asked].join(','));
	} catch {
		return [];
	}
};

export const palettesBySlug = (palettes) =>
	Object.fromEntries(
		(palettes ?? []).map((palette) => [palette.slug, palette]),
	);

const splitByPreference = (palettes, preferred) => {
	const bySlug = palettesBySlug(palettes);
	const ranked = (preferred ?? [])
		.map((slug) => bySlug[slug])
		.filter((palette, index, all) => palette && all.indexOf(palette) === index);
	const rest = (palettes ?? []).filter((palette) => !ranked.includes(palette));
	return [ranked, rest];
};

export const rankPalettes = (palettes, preferred = []) => {
	const [ranked, rest] = splitByPreference(palettes, preferred);
	return [...ranked, ...rest];
};

// A fresh draw per call, so a capped picker hides no palette permanently.
export const samplePalettes = (palettes, preferred = [], limit = Infinity) => {
	const [ranked, rest] = splitByPreference(palettes, preferred);
	return [...ranked, ...shuffle(rest)].slice(0, limit);
};

const shuffle = (items) => {
	const drawn = [...items];
	for (let i = drawn.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[drawn[i], drawn[j]] = [drawn[j], drawn[i]];
	}
	return drawn;
};
