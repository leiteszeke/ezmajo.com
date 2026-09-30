// Patch schema from the block's real `supports` — the model never hand-authors HTML.
// Structure only: the backend overlays the model-facing field descriptions.

import { SETTING_TEXT_BLOCKS } from '@agent/lib/setting-text-blocks';

const str = { type: 'string' };
const obj = (properties) => ({
	type: 'object',
	additionalProperties: false,
	properties,
});

// Color channels default on once color support is present, unless opted out.
const colorChannel = (color, channel) => {
	if (color === true) return true;
	if (!color || typeof color !== 'object') return false;
	return color[channel] !== false;
};

// Border/spacing/typography/dimensions are opt-in: `true`, or a truthy per-feature key.
const feat = (support, key) =>
	support === true ||
	(!!support && support[key] != null && support[key] !== false);

const prune = (properties) => {
	const out = {};
	for (const [key, value] of Object.entries(properties)) {
		if (value == null) continue;
		if (value.type === 'object' && !Object.keys(value.properties).length)
			continue;
		out[key] = value;
	}
	return out;
};

const styleSchema = (supports) => {
	const border = supports.border ?? supports.__experimentalBorder;
	const spacing = supports.spacing;
	const typography = supports.typography;
	const dimensions = supports.dimensions;

	const borderStyle = prune({
		color: feat(border, 'color') ? str : null,
		width: feat(border, 'width') ? str : null,
		style: feat(border, 'style') ? str : null,
		radius: feat(border, 'radius') ? str : null,
	});

	const spacingStyle = prune({
		padding: feat(spacing, 'padding') ? str : null,
		margin: feat(spacing, 'margin') ? str : null,
		blockGap: feat(spacing, 'blockGap') ? str : null,
	});

	const typographyStyle = prune({
		textAlign:
			feat(typography, 'textAlign') ||
			feat(typography, '__experimentalTextAlign')
				? str
				: null,
		lineHeight: feat(typography, 'lineHeight') ? str : null,
		fontFamily: feat(typography, '__experimentalFontFamily') ? str : null,
		fontWeight: feat(typography, '__experimentalFontWeight') ? str : null,
		fontStyle: feat(typography, '__experimentalFontStyle') ? str : null,
		textTransform: feat(typography, '__experimentalTextTransform') ? str : null,
		textDecoration: feat(typography, '__experimentalTextDecoration')
			? str
			: null,
		letterSpacing: feat(typography, '__experimentalLetterSpacing') ? str : null,
	});

	const dimensionsStyle = prune({
		minHeight: feat(dimensions, 'minHeight') ? str : null,
		aspectRatio: feat(dimensions, 'aspectRatio') ? str : null,
	});

	const style = prune({
		border: Object.keys(borderStyle).length ? obj(borderStyle) : null,
		spacing: Object.keys(spacingStyle).length ? obj(spacingStyle) : null,
		typography: Object.keys(typographyStyle).length
			? obj(typographyStyle)
			: null,
		dimensions: Object.keys(dimensionsStyle).length
			? obj(dimensionsStyle)
			: null,
		shadow: supports.shadow ? str : null,
		// The arbitrary-CSS escape hatch — always offered.
		css: str,
	});

	return obj(style);
};

const ALIGN_OPTIONS = ['left', 'center', 'right', 'wide', 'full'];

// supports.align is `true` (everything) or the block's own subset.
const alignSchema = (align) => {
	if (!align) return null;
	return {
		type: 'string',
		enum: align === true ? ALIGN_OPTIONS : align,
	};
};

// Positioning knobs only — allowedBlocks/default/allowEditing are editor config.
const layoutSchema = (supports) => {
	const layout = supports.layout ?? supports.__experimentalLayout;
	if (!layout || layout.allowEditing === false) return null;
	return obj({
		type: str,
		contentSize: str,
		wideSize: str,
		justifyContent: str,
		orientation: str,
		flexWrap: str,
		verticalAlignment: str,
	});
};

// Where a block keeps its editable text, most-specific first: `text` (button),
// `content` (paragraph, heading), `label` (menu item, search).
export const RICH_TEXT_ATTRIBUTES = ['text', 'content', 'label'];

// Identity attributes (ref, id, className, lock, metadata) stay out —
// bad values there break the block, not just its look.
const SIMPLE_ATTRIBUTES = [
	'level',
	'ordered',
	'reversed',
	'start',
	'width',
	'height',
	'verticalAlignment',
	'isStackedOnMobile',
	// media-text's image side is an attribute, not child order.
	'mediaPosition',
];

const simpleAttrSchema = (definition) => {
	if (!definition) return null;
	const schema = {};
	if (definition.type) schema.type = definition.type;
	if (definition.enum) schema.enum = definition.enum;
	return Object.keys(schema).length ? schema : str;
};

export const buildBlockSchema = (blockType) => {
	if (!blockType) return null;
	const attributes = blockType.attributes ?? {};
	const supports = blockType.supports ?? {};
	const typography = supports.typography;

	const simple = Object.fromEntries(
		SIMPLE_ATTRIBUTES.map((name) => [name, simpleAttrSchema(attributes[name])]),
	);

	const properties = prune({
		...simple,
		align: attributes.align ? alignSchema(supports.align) : null,
		// Quote and pullquote align text with an attribute, not a typography support.
		textAlign: attributes.textAlign
			? { type: 'string', enum: ['left', 'center', 'right'] }
			: null,
		layout: attributes.layout ? layoutSchema(supports) : null,
		// Model-facing name; block-patch maps it back to the real home.
		text:
			RICH_TEXT_ATTRIBUTES.some((name) => attributes[name]) ||
			SETTING_TEXT_BLOCKS[blockType.name]
				? str
				: null,
		url: attributes.url ? str : null,
		backgroundColor:
			attributes.backgroundColor && colorChannel(supports.color, 'background')
				? str
				: null,
		textColor:
			attributes.textColor && colorChannel(supports.color, 'text') ? str : null,
		// Gradients omitted: the theme's preset slugs are too opaque for the model
		// to pick reliably, so gradients go through style.css instead.
		fontSize: attributes.fontSize && feat(typography, 'fontSize') ? str : null,
		fontFamily:
			attributes.fontFamily && feat(typography, '__experimentalFontFamily')
				? str
				: null,
		style: styleSchema(supports),
	});

	if (!Object.keys(properties).length) return null;
	return obj(properties);
};
