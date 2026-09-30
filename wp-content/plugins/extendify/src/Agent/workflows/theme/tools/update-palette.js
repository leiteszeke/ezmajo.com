import updateVariation from '@agent/workflows/theme/tools/update-variation';
import { appliedVibeOwnership } from '@shared/lib/applied-vibes';
import {
	applyPaletteGlobals,
	applyPaletteStyles,
	purgePaletteGlobals,
} from '@shared/lib/palette-globals';
import { getServedPalettes, palettesBySlug } from '@shared/lib/palettes';
import { isObject } from '@shared/lib/utils';
import {
	preserveVibeSettings,
	preserveVibeStyles,
} from '@shared/lib/vibe-globals';
import apiFetch from '@wordpress/api-fetch';

const { globalStylesPostID } = window.extSharedData;

export default async ({ colorPalette, variation }) => {
	// The picker offers the theme's own variations when /api/palettes is down, and
	// a colourway leaves every palette leaf it does not declare standing.
	if (!colorPalette) {
		return variation
			? updateVariation({ variation, purge: purgePaletteGlobals })
			: null;
	}

	const siteStyle = await getSiteStyle();

	const [current, palettes, vibes] = await Promise.all([
		apiFetch({
			path: `/wp/v2/global-styles/${globalStylesPostID}?context=edit`,
		}),
		getServedPalettes('agent', [siteStyle.colorPalette, colorPalette]).then(
			palettesBySlug,
		),
		appliedVibeOwnership(siteStyle.vibe),
	]);

	// Reporting a colour change nothing wrote is worse than a failed turn.
	if (!palettes[colorPalette]) {
		throw new Error(`No served palette named ${colorPalette}`);
	}

	const { settings, styles } = palettes[colorPalette];

	// A second POST to global-styles drops the first.
	const [written] = await Promise.all([
		apiFetch({
			method: 'POST',
			path: `/wp/v2/global-styles/${globalStylesPostID}`,
			data: {
				id: globalStylesPostID,
				settings: preserveVibeSettings({
					mergedSettings: applyPaletteGlobals({
						currentSettings: current.settings,
						paletteSettings: settings,
						palettes,
					}),
					currentSettings: current.settings,
					vibes,
				}),
				styles: preserveVibeStyles({
					mergedStyles: applyPaletteStyles({
						currentStyles: current.styles,
						paletteStyles: styles,
						palettes,
					}),
					currentStyles: current.styles,
					vibes,
				}),
			},
		}),
		writeSiteStyle(siteStyle, colorPalette),
	]);

	return written;
};

const getSiteStyle = async () => {
	const { data } = await apiFetch({
		path: '/extendify/v1/launch/options?option=extendify_siteStyle',
	});

	// PHP serialises an empty object as [], which would spread into the write.
	return isObject(data) ? data : {};
};

const writeSiteStyle = (siteStyle, colorPalette) =>
	apiFetch({
		path: '/extendify/v1/launch/options',
		method: 'POST',
		data: {
			option: 'extendify_siteStyle',
			value: { ...siteStyle, colorPalette },
		},
	});
