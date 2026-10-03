import { fetchBlockCodeById } from '@agent/lib/block-code';
import { applyBlockPatch } from '@agent/lib/block-patch';
import { ensureCoreBlocksRegistered } from '@agent/lib/register-blocks';
import { getBlockType, parse } from '@wordpress/blocks';

// An accordion question keeps its text in `title`, not `content`.
const richTextAttribute = (markup) => {
	const attributes = getBlockType(parse(markup)[0]?.name)?.attributes ?? {};
	return Object.keys(attributes).find(
		(name) => attributes[name].source === 'rich-text',
	);
};

// null means no rewrite landed, so the save clones the original instead.
export const duplicateMarkup = async ({ blockId, texts }, source, postId) => {
	if (!texts?.length) return null;
	await ensureCoreBlocksRegistered();
	const original = await fetchBlockCodeById(blockId, source, postId);
	if (!original) return null;
	const inner = await Promise.all(
		texts.map(({ blockId: id }) => fetchBlockCodeById(id, source, postId)),
	);
	let copy = original;
	for (const [index, code] of inner.entries()) {
		const attribute = code && richTextAttribute(code);
		if (!attribute || !copy.includes(code)) continue;
		const rewritten = applyBlockPatch(code, {
			[attribute]: texts[index].text,
		});
		copy = copy.replace(code, () => rewritten);
	}
	return copy === original ? null : copy;
};
