import { downloadableBlocksManifest } from '@page-creator/lib/blocks';
import { useInstalledPluginsCache } from '@page-creator/state/plugins-cache';
import { store as blockDirectoryStore } from '@wordpress/block-directory';
import { dispatch } from '@wordpress/data';

const supportedBlocks = ['contact-form-7', 'simplybook'];

export const installBlocks = async ({ patterns }) => {
	const { installBlockType } = dispatch(blockDirectoryStore);
	const { installedPlugins, updateInstalledPlugins } =
		useInstalledPluginsCache.getState();

	const code = patterns
		.flatMap((p) => p.patternReplacementCode)
		.filter(Boolean);

	// Look for any blocks we support installing
	const foundBlocks = supportedBlocks.filter(
		(block) =>
			code.some((c) => c.includes(block)) && !installedPlugins.includes(block),
	); // Install the blocks
	for (const block of foundBlocks) {
		const blockManifest = downloadableBlocksManifest[block];
		if (blockManifest) await installBlockType(blockManifest);
	}

	await updateInstalledPlugins();
};
