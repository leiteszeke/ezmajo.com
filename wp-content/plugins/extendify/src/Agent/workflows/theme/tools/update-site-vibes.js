import { replaceVibeBlocks } from '@shared/lib/vibe-blocks';
import {
	applyVibeGlobals,
	applyVibeStyles,
	vibeGlobalsEntry,
} from '@shared/lib/vibe-globals';
import { getVibes, vibesBySlug } from '@shared/lib/vibes';
import apiFetch from '@wordpress/api-fetch';

const globalStylesPostID = window.extSharedData?.globalStylesPostID;

export default async ({ selectedVibe }) => {
	if (
		!selectedVibe ||
		typeof selectedVibe !== 'string' ||
		selectedVibe.trim() === ''
	) {
		return;
	}

	try {
		const [currentGlobalStyles, payloads] = await Promise.all([
			apiFetch({
				path: `/wp/v2/global-styles/${globalStylesPostID}?context=edit`,
			}),
			// Same query the picker asked for, so this reads the cached response.
			getVibes(`agent,${selectedVibe}`),
		]);

		const vibes = vibesBySlug(payloads);
		const entry = vibeGlobalsEntry(vibes, selectedVibe);
		const currentStyles = currentGlobalStyles.styles;

		const styles = applyVibeStyles({
			currentStyles,
			vibeStyles: entry?.styles,
			vibes,
		});

		// One post holds all three, so a second POST would drop the first.
		await Promise.all([
			apiFetch({
				method: 'POST',
				path: `/wp/v2/global-styles/${globalStylesPostID}`,
				data: {
					id: globalStylesPostID,
					settings: applyVibeGlobals({
						currentSettings: currentGlobalStyles.settings,
						vibeSettings: entry?.settings,
						vibes,
					}),
					styles: {
						...styles,
						// Pre-apply blocks here would drop the css applyVibeStyles wrote.
						blocks: replaceVibeBlocks({
							currentBlocks: styles?.blocks,
							vibeBlocks: vibes[selectedVibe]?.blocks,
							selectedVibe,
						}),
					},
				},
			}),
			updateSiteStyleOption(selectedVibe),
		]);
	} catch (error) {
		const errorMessage =
			error?.response?.data?.message || error?.message || 'Unknown error';
		throw new Error(`Vibe update failed: ${errorMessage}`);
	}
};

const updateSiteStyleOption = async (selectedVibe) => {
	const { data: currentSiteStyle } = await apiFetch({
		path: '/extendify/v1/launch/options?option=extendify_siteStyle',
	});

	const existingSiteStyle =
		currentSiteStyle &&
		typeof currentSiteStyle === 'object' &&
		!Array.isArray(currentSiteStyle)
			? currentSiteStyle
			: {};

	const updatedSiteStyle = { ...existingSiteStyle, vibe: selectedVibe };

	return await apiFetch({
		path: '/extendify/v1/launch/options',
		method: 'POST',
		data: { option: 'extendify_siteStyle', value: updatedSiteStyle },
	});
};
