import { applyBlockPatch } from '@agent/lib/block-patch';
import { createBlock, getBlockType, parse, serialize } from '@wordpress/blocks';

// The add catalog the backend prompt offers — the plugin constrains it, not
// the backend, so old fielded builds never see types they can't build.
export const INSERTABLE_BLOCK_TYPES = [
	'core/button',
	'core/heading',
	'core/paragraph',
	'core/list',
	'core/quote',
	'core/pullquote',
	'core/code',
	'core/preformatted',
	'core/verse',
	'core/group',
	'core/column',
	'core/spacer',
	'core/separator',
];

// One level of explicit children, on containers only.
const CHILD_BEARING_TYPES = ['core/group', 'core/column'];

// The model authors `text`; each type stores it under its own attribute.
const RICH_TEXT_ATTR = {
	'core/button': 'text',
	'core/heading': 'content',
	'core/paragraph': 'content',
	'core/pullquote': 'value',
	'core/code': 'content',
	'core/preformatted': 'content',
	'core/verse': 'content',
};

const paragraphChildren = (text) =>
	text ? [createBlock('core/paragraph', { content: text })] : [];

// A bare column is only valid inside core/columns, so it can't be a child.
const childBlocks = (children) =>
	(children ?? [])
		.filter(
			({ blockType }) =>
				blockType !== 'core/column' &&
				INSERTABLE_BLOCK_TYPES.includes(blockType) &&
				getBlockType(blockType),
		)
		.map(({ blockType, text }) =>
			blockType === 'core/button'
				? createBlock('core/buttons', {}, [freshBlock('core/button', text)])
				: freshBlock(blockType, text),
		);

const freshBlock = (blockType, text, children = []) => {
	if (blockType === 'core/list') {
		// The model sometimes authors <li> markup despite the plain-text
		// instruction; splitting on it beats an empty leading item.
		const items = String(text ?? '')
			.replaceAll(/<\/?li[^>]*>/gi, '\n')
			.split('\n')
			.map((line) => line.trim())
			.filter(Boolean);
		return createBlock(
			'core/list',
			{},
			items.map((content) => createBlock('core/list-item', { content })),
		);
	}
	if (CHILD_BEARING_TYPES.includes(blockType)) {
		const composed = childBlocks(children);
		return createBlock(
			blockType,
			{},
			composed.length ? composed : paragraphChildren(text),
		);
	}
	// Quote holds its text as a paragraph child, not an attribute.
	if (blockType === 'core/quote')
		return createBlock(blockType, {}, paragraphChildren(text));
	const attribute = RICH_TEXT_ATTR[blockType];
	return createBlock(
		blockType,
		attribute && text != null ? { [attribute]: text } : {},
	);
};

export const buildNewBlock = (
	blockType,
	patch = {},
	clear = [],
	presetSlugs = {},
) => {
	if (!INSERTABLE_BLOCK_TYPES.includes(blockType)) return null;
	if (!getBlockType(blockType)) return null;
	const { text, children, ...attributePatch } = patch ?? {};
	const markup = applyBlockPatch(
		serialize([freshBlock(blockType, text, children ?? [])]),
		attributePatch,
		clear ?? [],
		presetSlugs,
	);
	if (blockType !== 'core/button') return markup;
	// A lone button never exists in the editor; ship it inside its wrapper.
	return serialize([createBlock('core/buttons', {}, parse(markup))]);
};
