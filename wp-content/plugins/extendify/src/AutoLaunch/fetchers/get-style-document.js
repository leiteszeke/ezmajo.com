import {
	applyPaletteGlobals,
	applyPaletteStyles,
} from '@shared/lib/palette-globals';
import { getServedPalettes, palettesBySlug } from '@shared/lib/palettes';
import { deepMerge } from '@shared/lib/utils';

const empty = { settings: {}, styles: {} };

// The families ship with the theme; only a hosted font needs installing.
const fontLeaves = (fonts) => {
	const { heading, body } = fonts ?? {};
	if (!heading?.slug && !body?.slug) return empty;

	return {
		settings: {
			typography: {
				fontFamilies: {
					custom: [heading, body].filter((font) => !!font?.host),
				},
			},
		},
		styles: {
			...(body?.slug && {
				typography: {
					fontFamily: `var(--wp--preset--font-family--${body.slug})`,
				},
			}),
			...(heading?.slug && {
				elements: {
					heading: {
						typography: {
							fontFamily: `var(--wp--preset--font-family--${heading.slug})`,
						},
					},
				},
			}),
		},
	};
};

const paletteLeaves = async (colorPalette) => {
	if (!colorPalette) return empty;

	const palettes = palettesBySlug(
		await getServedPalettes('launch', colorPalette),
	);
	const palette = palettes[colorPalette];
	// An unresolved slug leaves the theme's own colourway standing.
	if (!palette) return empty;

	return {
		settings: applyPaletteGlobals({
			currentSettings: {},
			paletteSettings: palette.settings,
			palettes,
		}),
		styles: applyPaletteStyles({
			currentStyles: {},
			paletteStyles: palette.styles,
			palettes,
		}),
	};
};

export const getStyleDocument = async ({ colorPalette, fonts }) =>
	deepMerge(await paletteLeaves(colorPalette), fontLeaves(fonts));
