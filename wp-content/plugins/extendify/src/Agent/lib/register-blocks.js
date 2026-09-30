import { getBlockTypes } from '@wordpress/blocks';

// Lazy import so always-loaded bundles don't pull in the whole block editor.
export const ensureCoreBlocksRegistered = async () => {
	if (getBlockTypes().length) return;
	const { registerCoreBlocks } = await import('@wordpress/block-library');
	registerCoreBlocks();
};
