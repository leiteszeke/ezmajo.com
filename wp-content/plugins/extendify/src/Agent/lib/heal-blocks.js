import { createBlock, getBlockType, parse, serialize } from '@wordpress/blocks';

const isDeepValid = (block) =>
	block.isValid !== false && block.innerBlocks.every(isDeepValid);

// Unregistered types keep their raw source; only registered ones can rebuild.
const recoverBlock = (block) => {
	const innerBlocks = block.innerBlocks.map(recoverBlock);
	if (block.isValid !== false || !getBlockType(block.name))
		return { ...block, innerBlocks };
	return createBlock(block.name, block.attributes, innerBlocks);
};

// The editor's "Attempt recovery" rebuild — model HTML drifting from save() breaks the block otherwise.
export const healBlockMarkup = (markup) => {
	const blocks = parse(markup);
	if (blocks.every(isDeepValid)) return markup;
	return serialize(blocks.map(recoverBlock));
};
