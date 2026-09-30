import { isObject } from '@shared/lib/utils';

// Patterns are authored against natural-1 class names, so each payload node is
// re-keyed from the vibe's own slug to its natural-1 name.
export const rekeyVibeBlocks = (vibeBlocks, selectedVibe) =>
	Object.fromEntries(
		Object.entries(vibeBlocks ?? {})
			.filter(([, variations]) => isObject(variations))
			.map(([blockName, variations]) => [
				blockName,
				{
					variations: Object.fromEntries(
						Object.entries(variations).map(([styleName, styleProperties]) => [
							styleName.replace(`--${selectedVibe}--`, '--natural-1--'),
							{ ...styleProperties },
						]),
					),
				},
			]),
	);

// ext-preset-- variations belong to the outgoing vibe; user variations stay.
// natural-1 is written too: a theme with no presets has nothing to fall back on.
export const replaceVibeBlocks = ({
	currentBlocks = {},
	vibeBlocks = {},
	selectedVibe,
}) => {
	const updatedBlocks = Object.fromEntries(
		Object.entries(currentBlocks).map(([blockName, blockObj]) => {
			const { variations = {}, ...rest } = blockObj;
			const userVariations = Object.fromEntries(
				Object.entries(variations).filter(
					([styleName]) => !styleName.startsWith('ext-preset--'),
				),
			);

			return [
				blockName,
				Object.keys(userVariations).length > 0
					? { ...rest, variations: userVariations }
					: rest,
			];
		}),
	);

	for (const [blockName, { variations }] of Object.entries(
		rekeyVibeBlocks(vibeBlocks, selectedVibe),
	)) {
		const currentBlock = updatedBlocks[blockName] || {};
		updatedBlocks[blockName] = {
			...currentBlock,
			variations: { ...currentBlock.variations, ...variations },
		};
	}

	return updatedBlocks;
};
