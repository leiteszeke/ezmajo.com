import {
	applyPaletteGlobals,
	applyPaletteStyles,
} from '@shared/lib/palette-globals';
import { getServedPalettes, palettesBySlug } from '@shared/lib/palettes';
import apiFetch from '@wordpress/api-fetch';

const id = window.extSharedData.globalStylesPostID;

export default async ({ palette, duotone }) => {
	const [currentStyles, currentVibes, palettes] = await Promise.all([
		apiFetch({ path: `/wp/v2/global-styles/${id}` }),
		apiFetch({ path: '/extendify/v1/agent/block-style-variations' }),
		appliedPalettes(),
	]);

	const preservedBlocks = Object.keys(currentVibes).reduce(
		(blocks, blockName) => {
			blocks[blockName] = {
				...currentStyles.styles?.blocks?.[blockName],
				variations: currentVibes[blockName],
			};
			return blocks;
		},
		{},
	);

	// A generated palette declares presets only; the rest would stand on the old one.
	const settings = applyPaletteGlobals({
		currentSettings: currentStyles.settings,
		palettes,
	});

	const styles = applyPaletteStyles({
		currentStyles: {
			...currentStyles.styles,
			blocks: {
				...currentStyles.styles?.blocks,
				...preservedBlocks,
			},
		},
		palettes,
	});

	const colorSettings = {
		...settings?.color,
		palette: {
			...settings?.color?.palette,
			theme: palette.colors.map(({ slug, color, name }) => ({
				slug,
				color,
				name,
			})),
		},
	};

	if (duotone) {
		colorSettings.duotone = { ...settings?.color?.duotone, theme: duotone };
	}

	return apiFetch({
		method: 'POST',
		path: `/wp/v2/global-styles/${id}`,
		data: { id, settings: { ...settings, color: colorSettings }, styles },
	});
};

const appliedPalettes = async () => {
	try {
		const { data } = await apiFetch({
			path: '/extendify/v1/launch/options?option=extendify_siteStyle',
		});

		return palettesBySlug(await getServedPalettes('agent', data?.colorPalette));
	} catch {
		return {};
	}
};
