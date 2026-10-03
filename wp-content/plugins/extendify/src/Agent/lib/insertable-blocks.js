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
	'core/social-link',
	'core/navigation-link',
	// Says the save can nest a link under a menu item; never added on its own.
	'core/navigation-submenu',
];

// One level of explicit children, on containers only.
const CHILD_BEARING_TYPES = ['core/group', 'core/column'];

// A lone button or social icon is invalid markup.
const ROW_ONLY_TYPES = {
	'core/button': 'core/buttons',
	'core/social-link': 'core/social-links',
};

// The model authors `text`; each type stores it under its own attribute.
const RICH_TEXT_ATTR = {
	'core/button': 'text',
	'core/heading': 'content',
	'core/paragraph': 'content',
	'core/pullquote': 'value',
	'core/code': 'content',
	'core/preformatted': 'content',
	'core/verse': 'content',
	'core/navigation-link': 'label',
};

const paragraphChildren = (text) =>
	text ? [createBlock('core/paragraph', { content: text })] : [];

// A bare column is only valid inside core/columns, so it can't be a child.
const childBlocks = (children) =>
	(children ?? [])
		.filter(
			({ blockType }) =>
				// A composed child only carries text, and neither type is valid on its own.
				blockType !== 'core/social-link' &&
				blockType !== 'core/navigation-link' &&
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
	{ joinsRow = false } = {},
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
	// Landing beside a sibling puts it in that row already; wrapping would nest one.
	const row = joinsRow ? null : ROW_ONLY_TYPES[blockType];
	if (!row) return markup;
	return serialize([createBlock(row, {}, parse(markup))]);
};
