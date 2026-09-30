import { buildPaletteCssMap } from '@shared/lib/palette-preview';
import {
	getServedPalettes,
	palettesBySlug,
	rankPalettes,
} from '@shared/lib/palettes';
import { getVibes, vibesBySlug } from '@shared/lib/vibes';
import apiFetch from '@wordpress/api-fetch';
import useSWRImmutable from 'swr/immutable';

export const usePalettes = () => {
	const { data, error, isLoading } = useSWRImmutable(
		{ key: 'agent-palettes' },
		fetcher,
	);
	return {
		palettes: data?.palettes,
		css: data?.css,
		preferred: data?.preferred,
		error,
		isLoading,
	};
};

const fetcher = async () => {
	const siteStyle = await getSiteStyle();
	const [palettes, preferred, theme] = await Promise.all([
		getServedPalettes('agent', siteStyle?.colorPalette),
		getPreferredPalettes(siteStyle?.vibe),
		getThemeGlobalStyles(),
	]);

	if (!palettes.length) return null;

	return {
		palettes: rankPalettes(palettes, preferred),
		preferred,
		css: buildPaletteCssMap({
			payloads: palettesBySlug(palettes),
			themeStyles: theme?.styles,
			themeSettings: theme?.settings,
		}),
	};
};

const getSiteStyle = async () => {
	try {
		const { data } = await apiFetch({
			path: '/extendify/v1/launch/options?option=extendify_siteStyle',
		});
		return data;
	} catch {
		return null;
	}
};

const getPreferredPalettes = async (vibe) => {
	if (!vibe) return [];

	try {
		const vibes = await getVibes(`agent,${vibe}`);
		return vibesBySlug(vibes)[vibe]?.preferredPalettes ?? [];
	} catch {
		return [];
	}
};

// Without the theme's own values a reset falls back to revert, not the theme.
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
