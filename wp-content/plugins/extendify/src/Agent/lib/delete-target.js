import { BLOCK_ID_SEL, blockIdOf, findBlockEl } from './block-el';
import { detectBlockType } from './block-type';

// Wrappers that are broken markup without their last item — the op takes the
// wrapper. Not group/columns: an empty one still renders a box worth keeping.
const LIST_WRAPPERS = new Set([
	'core/buttons',
	'core/social-links',
	'core/list',
	'core/quote',
]);

// The wrapper never reaches the model (dropped from the manifest), so "delete this
// button" can only name the button — walk up to the wrapper when it's the last item.
export const resolveDeleteTarget = (blockId, scope = null) => {
	const el = findBlockEl(blockId, document, scope);
	if (!el) return blockId;
	let targetId = blockId;
	let parent = el.parentElement?.closest(BLOCK_ID_SEL);
	while (
		parent &&
		LIST_WRAPPERS.has(detectBlockType(parent)) &&
		parent.querySelectorAll(BLOCK_ID_SEL).length === 1
	) {
		targetId = blockIdOf(parent);
		parent = parent.parentElement?.closest(BLOCK_ID_SEL);
	}
	return targetId;
};
