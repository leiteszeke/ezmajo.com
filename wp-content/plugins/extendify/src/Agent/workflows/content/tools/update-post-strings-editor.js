import { getRenderingMode, setRenderingMode } from '@agent/lib/editor';
import { createBlock } from '@wordpress/blocks';
import { dispatch, select } from '@wordpress/data';

export default async ({ replacements }) => {
	const renderingMode = getRenderingMode();
	// temp disable if user has templates showing
	if (renderingMode === 'template-locked') await setRenderingMode('post-only');
	const postTitle = select('core/editor').getEditedPostAttribute('title');
	const updatedTitle = replaceInString(postTitle, replacements);
	dispatch('core/editor').editPost({ title: updatedTitle });

	const blocks = select('core/block-editor').getBlocks();
	const changedBlocks = blocks.flatMap((block) =>
		findChangedBlocks(block, replacements),
	);

	changedBlocks.forEach(({ clientId, block }) => {
		dispatch('core/block-editor').replaceBlock(clientId, block);
	});
	if (renderingMode === 'template-locked') setRenderingMode('template-locked');
	return;
};

// Supports multiple replacements in a string
const replaceInString = (str, replacements) =>
	replacements
		.filter((r) => r.original !== '')
		.reduce(
			(acc, { original, updated }) => acc.split(original).join(updated),
			str,
		);

const findChangedBlocks = (block, replacements) => {
	const changedBlocks = [];
	const newAttributes = { ...block.attributes };
	let changed = false;

	// Check all these attributes for changes
	['content', 'caption', 'alt', 'title', 'value', 'text'].forEach((key) => {
		const val = newAttributes[key];
		// Handles rich text and strings
		const str =
			val && typeof val.toString === 'function' ? val.toString() : val;
		if (typeof str === 'string') {
			const replaced = replaceInString(str, replacements);
			if (replaced !== str) {
				newAttributes[key] = replaced;
				changed = true;
			}
		}
	});

	if (changed) {
		// If we found blocks to change, add them to the list
		const newBlock = createBlock(block.name, newAttributes, block.innerBlocks);
		changedBlocks.push({ clientId: block.clientId, block: newBlock });
	}

	// Recursively check inner blocks
	block.innerBlocks.forEach((inner) => {
		changedBlocks.push(...findChangedBlocks(inner, replacements));
	});

	return changedBlocks;
};
