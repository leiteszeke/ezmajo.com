import { isObject } from '@shared/lib/utils';
import {
	buildVibeResetCss,
	withAppliedVariation,
} from '@shared/lib/vibe-preview';
import { getVibes, vibeCssBySlug, vibesBySlug } from '@shared/lib/vibes';
import apiFetch from '@wordpress/api-fetch';
import useSWRImmutable from 'swr/immutable';

export const useSiteVibesVariations = () => {
	const { data, error, isLoading } = useSWRImmutable(
		{ key: 'site-vibes-variations' },
		fetcher,
	);
	return { data, error, isLoading };
};

const fetcher = async () => {
	const optionsResponse = await apiFetch({
		path: '/extendify/v1/launch/options?option=extendify_siteStyle',
	});

	const siteStyle = optionsResponse?.data;
	const currentVibe = siteStyle?.vibe || 'natural-1';

	// The site's current vibe is not necessarily offered on this surface.
	const payloads = await getVibes(`agent,${currentVibe}`);
	if (!payloads.length) return null;

	const bySlug = vibesBySlug(payloads);
	const [theme, variation] = await Promise.all([
		getThemeGlobalStyles(),
		getAppliedVariation(siteStyle),
	]);
	const themeStyles = withAppliedVariation(theme?.styles, variation?.styles);
	const themeSettings = withAppliedVariation(
		theme?.settings,
		variation?.settings,
	);

	return {
		vibes: payloads.map(({ slug, title }) => ({ name: title || slug, slug })),
		css: vibeCssBySlug(payloads),
		payloads: bySlug,
		resets: Object.fromEntries(
			Object.keys(bySlug).map((slug) => [
				slug,
				buildVibeResetCss({
					payloads: bySlug,
					slug,
					themeStyles,
					themeSettings,
				}),
			]),
		),
		currentVibe,
	};
};

const getThemeGlobalStyles = async () => {
	const themeSlug = window.extAgentData?.context?.themeSlug;
	if (!themeSlug) return null;

	try {
		return await apiFetch({
			path: `/wp/v2/global-styles/themes/${themeSlug}?context=edit`,
		});
	} catch {
		return null;
	}
};

// Sites launched before extendify_siteStyle carried the variation hold it on
// the legacy AutoLaunch row only.
const getAppliedVariation = async (siteStyle) => {
	if (isObject(siteStyle?.variation)) return siteStyle.variation;

	try {
		const { data } = await apiFetch({
			path: '/extendify/v1/launch/options?option=extendify_site_style',
		});
		return isObject(data?.variation) ? data.variation : null;
	} catch {
		return null;
	}
};
