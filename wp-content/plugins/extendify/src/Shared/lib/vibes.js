import { AI_HOST } from '@constants';

// The whole set is a third of a megabyte, so callers ask for what they show.
export const getVibes = async (query = '') => {
	const url = new URL(`${AI_HOST}/api/vibes`);
	if (query) url.searchParams.set('vibes', query);

	const response = await fetch(url, {
		method: 'GET',
		headers: { 'Content-Type': 'application/json' },
	});

	if (!response.ok) throw new Error('Bad response from server');

	const { vibes } = await response.json();
	return Array.isArray(vibes) ? vibes : [];
};

export const vibesBySlug = (vibes) =>
	Object.fromEntries((vibes ?? []).map((vibe) => [vibe.slug, vibe]));

export const vibeCssBySlug = (vibes) =>
	Object.fromEntries((vibes ?? []).map(({ slug, css }) => [slug, css ?? '']));
