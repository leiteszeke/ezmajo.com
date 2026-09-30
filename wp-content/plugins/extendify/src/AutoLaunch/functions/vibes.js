import { replaceVibeBlocks } from '@shared/lib/vibe-blocks';
import { applyVibeGlobals, applyVibeStyles } from '@shared/lib/vibe-globals';
import { getVibes, vibesBySlug } from '@shared/lib/vibes';

// natural-1 is what the theme already ships, so it contributes nothing.
const isValidVibe = (selectedVibe) =>
	!!selectedVibe &&
	typeof selectedVibe === 'string' &&
	selectedVibe.trim() !== '' &&
	selectedVibe !== 'natural-1';

// Layout rides along because WordPress derives fluid type from wideSize.
export const computeVibeAdjustments = async (selectedVibe, variation) => {
	if (!isValidVibe(selectedVibe)) return null;

	const vibes = vibesBySlug(await getVibes(selectedVibe));
	const vibe = vibes[selectedVibe];
	if (!vibe) return null;

	const styles = applyVibeStyles({
		currentStyles: variation?.styles ?? {},
		vibeStyles: vibe.styles,
		vibes,
	});

	return {
		settings: applyVibeGlobals({
			currentSettings: variation?.settings ?? {},
			vibeSettings: vibe.settings,
			vibes,
		}),
		styles: {
			...styles,
			blocks: replaceVibeBlocks({
				currentBlocks: styles?.blocks,
				vibeBlocks: vibe.blocks,
				selectedVibe,
			}),
		},
	};
};
