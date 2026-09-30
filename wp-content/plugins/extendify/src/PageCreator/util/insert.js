import { dispatch, select } from '@wordpress/data';

export const insertBlocks = async (blocks) => {
	const { insertBlocks, replaceBlock } = dispatch('core/block-editor');
	const {
		getSelectedBlock,
		getBlockHierarchyRootClientId,
		getBlockIndex,
		getGlobalBlockCount,
	} = select('core/block-editor');

	const { clientId, name, attributes } = getSelectedBlock() || {};
	const rootClientId = clientId ? getBlockHierarchyRootClientId(clientId) : '';
	const insertPointIndex =
		(rootClientId ? getBlockIndex(rootClientId) : getGlobalBlockCount()) + 1;

	if (name === 'core/paragraph' && attributes?.content === '') {
		return await replaceBlock(clientId, blocks);
	}
	return await insertBlocks(blocks, insertPointIndex);
};
