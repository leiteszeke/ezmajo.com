import { RICH_TEXT_ATTRIBUTES } from '@agent/lib/block-schema';
import { getBlockType, parse, serialize } from '@wordpress/blocks';
import { colord } from 'colord';

const isMergeable = (value) =>
	value && typeof value === 'object' && !Array.isArray(value);

// Result aliases both inputs' subtrees — every helper below must not mutate.
const deepMerge = (base, patch) => {
	const out = { ...base };
	for (const [key, value] of Object.entries(patch)) {
		if (value == null) continue;
		out[key] =
			isMergeable(value) && isMergeable(out[key])
				? deepMerge(out[key], value)
				: value;
	}
	return out;
};

const setIn = (obj, parts, value) => {
	const [head, ...rest] = parts;
	if (!rest.length) return { ...obj, [head]: value };
	const child = isMergeable(obj?.[head]) ? obj[head] : {};
	return { ...obj, [head]: setIn(child, rest, value) };
};
const setPath = (attributes, path, value) =>
	setIn(attributes, path.split('.'), value);

const unsetIn = (obj, parts) => {
	const [head, ...rest] = parts;
	if (!isMergeable(obj) || !(head in obj)) return obj;
	if (!rest.length) {
		const { [head]: _, ...kept } = obj;
		return kept;
	}
	return { ...obj, [head]: unsetIn(obj[head], rest) };
};
const unsetPath = (attributes, path) => unsetIn(attributes, path.split('.'));

const dropClasses = (attributes, shouldDrop) => {
	if (!attributes.className) return attributes;
	const kept = attributes.className
		.split(/\s+/)
		.filter((cls) => cls && !shouldDrop(cls))
		.join(' ');
	if (kept) return { ...attributes, className: kept };
	return unsetPath(attributes, 'className');
};

// Baked preset color classes (has-primary-color) carry !important and outrank
// the custom color; save() regenerates the generic markers, so only named ones go.
const isPresetColorClass =
	({ text, background }) =>
	(cls) => {
		const isBgPreset = /^has-[\w-]+-background-color$/.test(cls);
		const isTextPreset =
			/^has-[\w-]+-color$/.test(cls) &&
			!isBgPreset &&
			cls !== 'has-text-color' &&
			cls !== 'has-link-color';
		return Boolean((text && isTextPreset) || (background && isBgPreset));
	};

const COLOR_CHANNELS = [
	['backgroundColor', 'background'],
	['textColor', 'text'],
];

// A known slug maps to a theme preset class; anything else routes to inline
// style.color.* — so "yellow" (no matching token) never lands on a wrong slug.
// Kept inline, a token's own hex stops the block following the palette.
const slugForValue = (value, colorValues) => {
	const wanted = colord(value);
	if (!wanted.isValid()) return null;
	const hex = wanted.toHex();
	const match = Object.entries(colorValues ?? {}).find(([, preset]) => {
		const parsed = colord(String(preset));
		return parsed.isValid() && parsed.toHex() === hex;
	});
	return match?.[0] ?? null;
};

const routeColors = (attributes, patch, colorSlugs, colorValues) => {
	const slugs = new Set(colorSlugs ?? []);
	const stripped = {};
	let out = attributes;
	for (const [named, key] of COLOR_CHANNELS) {
		const value = patch?.[named];
		if (value == null) continue;
		const named_slug = slugs.has(value)
			? value
			: slugForValue(value, colorValues);
		if (named_slug) {
			if (named_slug !== value) out = setPath(out, named, named_slug);
			out = unsetPath(out, `style.color.${key}`);
			continue;
		}
		const parsed = colord(value);
		out = setPath(
			out,
			`style.color.${key}`,
			parsed.isValid() ? parsed.toHex() : value,
		);
		out = unsetPath(out, named);
		stripped[key] = true;
	}
	if (stripped.text || stripped.background) {
		out = dropClasses(out, isPresetColorClass(stripped));
	}
	return out;
};

// Colours WP stores as a slug attribute beside a custom-value attribute.
const PAIRED_COLORS = [
	{
		named: 'overlayColor',
		custom: 'customOverlayColor',
		flag: 'isUserOverlayColor',
	},
	// The icon renders from the value alone; the slug only adds a class.
	{ named: 'iconColor', custom: 'iconColorValue', valueForSlug: true },
	{
		named: 'iconBackgroundColor',
		custom: 'iconBackgroundColorValue',
		valueForSlug: true,
	},
];

const routePairedColors = (attributes, patch, colorSlugs, colorValues) => {
	const slugs = new Set(colorSlugs ?? []);
	let out = attributes;
	for (const { named, custom, flag, valueForSlug } of PAIRED_COLORS) {
		const value = patch?.[named];
		if (value == null) continue;
		const slug = slugs.has(value) ? value : slugForValue(value, colorValues);
		if (slug) {
			out = { ...out, [named]: slug };
			const slugHex = colorValues?.[slug];
			out =
				valueForSlug && slugHex
					? { ...out, [custom]: colord(String(slugHex)).toHex() }
					: unsetPath(out, custom);
		} else {
			const parsed = colord(value);
			out = unsetPath(
				{ ...out, [custom]: parsed.isValid() ? parsed.toHex() : value },
				named,
			);
		}
		if (flag) out = { ...out, [flag]: true };
	}
	return out;
};

// fontSize / fontFamily mirror the color routing: known slug → named attribute
// (preset class), anything else → the inline style path.
const NAMED_PRESETS = [
	{
		named: 'fontSize',
		path: 'style.typography.fontSize',
		slugs: 'fontSize',
		classRe: /^has-[\w-]+-font-size$/,
	},
	{
		named: 'fontFamily',
		path: 'style.typography.fontFamily',
		slugs: 'fontFamily',
		classRe: /^has-[\w-]+-font-family$/,
	},
];

const routeNamedPresets = (attributes, patch, presetSlugs) => {
	const strippers = [];
	let out = attributes;
	for (const { named, path, slugs, classRe } of NAMED_PRESETS) {
		const value = patch?.[named];
		if (value == null) continue;
		if (new Set(presetSlugs?.[slugs] ?? []).has(value)) {
			out = unsetPath(out, path);
			continue;
		}
		out = unsetPath(setPath(out, path, value), named);
		strippers.push(classRe);
	}
	if (strippers.length) {
		out = dropClasses(out, (cls) => strippers.some((re) => re.test(cls)));
	}
	return out;
};

// Which color side a cleared path removes, so its baked preset class goes too.
const CLEAR_COLOR_SIDE = {
	backgroundColor: 'background',
	'style.color.background': 'background',
	textColor: 'text',
	'style.color.text': 'text',
};

// A routed field lands in a named attr or an inline style; clearing must unset both.
const ROUTED_PAIRS = [
	['backgroundColor', 'style.color.background'],
	['textColor', 'style.color.text'],
	['gradient', 'style.color.gradient'],
	...NAMED_PRESETS.map(({ named, path }) => [named, path]),
	...PAIRED_COLORS.map(({ named, custom }) => [named, custom]),
];
const CLEAR_ALIASES = Object.fromEntries(
	ROUTED_PAIRS.flatMap((pair) => pair.map((p) => [p, pair])),
);

// null means "no change", so removal has its own channel: paths listed to reset.
const applyClears = (attributes, clear) => {
	const sides = {};
	let out = attributes;
	for (const path of clear) {
		for (const p of CLEAR_ALIASES[path] ?? [path]) out = unsetPath(out, p);
		if (CLEAR_COLOR_SIDE[path]) sides[CLEAR_COLOR_SIDE[path]] = true;
	}
	if (sides.text || sides.background) {
		out = dropClasses(out, isPresetColorClass(sides));
	}
	return out;
};

// The model always says `text`; blocks that keep theirs elsewhere need the remap.
const remapText = (block, patch) => {
	if (patch?.text == null) return patch;
	const attributes = getBlockType(block.name)?.attributes ?? {};
	const real = RICH_TEXT_ATTRIBUTES.find((name) => attributes[name]);
	if (!real || real === 'text') return patch;
	const { text, ...rest } = patch;
	return { ...rest, [real]: text };
};

// Re-serializing runs the block's own save(), which core/button needs to render
// the color/border styles it marks __experimentalSkipSerialization.
// Merging an empty value leaves a dead key and keeps the preset class.
const emptyLeafPaths = (patch, prefix = '') =>
	Object.entries(patch ?? {}).flatMap(([key, value]) => {
		const path = prefix ? `${prefix}.${key}` : key;
		if (isMergeable(value)) return emptyLeafPaths(value, path);
		return value === '' ? [path] : [];
	});

// A block with no style would otherwise save the patch's null and emptied keys.
const withoutEmptyLeaves = (patch) =>
	Object.fromEntries(
		Object.entries(patch ?? {}).flatMap(([key, value]) => {
			if (isMergeable(value)) {
				const kept = withoutEmptyLeaves(value);
				return Object.keys(kept).length ? [[key, kept]] : [];
			}
			return value === '' || value == null ? [] : [[key, value]];
		}),
	);

// Patch values arrive as strings; the parser drops "30" on a number attribute.
const coerceTypes = (block, patch) => {
	const attributes = getBlockType(block.name)?.attributes ?? {};
	let out = patch;
	for (const [key, value] of Object.entries(patch ?? {})) {
		if (typeof value !== 'string') continue;
		const type = attributes[key]?.type;
		if (type === 'boolean' && ['true', 'false'].includes(value)) {
			out = { ...out, [key]: value === 'true' };
			continue;
		}
		if (type !== 'number') continue;
		const [, amount, unit] =
			value.trim().match(/^(-?\d*\.?\d+)\s*([a-z%]*)$/i) ?? [];
		if (amount == null) continue;
		out = { ...out, [key]: Number(amount) };
		// The model writes lengths like "60vh" into the number field.
		const unitKey = `${key}Unit`;
		if (unit && attributes[unitKey] && out[unitKey] == null) {
			out = { ...out, [unitKey]: unit };
		}
	}
	return out;
};

export const applyBlockPatch = (
	serializedBlock,
	patch,
	clear = [],
	presetSlugs = {},
) => {
	const blocks = parse(serializedBlock).map((block) => {
		if (!block.name) return block;
		const remapped = remapText(block, patch);
		const filled = coerceTypes(block, withoutEmptyLeaves(remapped));
		const merged = deepMerge(block.attributes, filled);
		const colored = routePairedColors(
			routeColors(merged, filled, presetSlugs.color, presetSlugs.colorValues),
			filled,
			presetSlugs.color,
			presetSlugs.colorValues,
		);
		const routed = routeNamedPresets(colored, filled, presetSlugs);
		return {
			...block,
			attributes: applyClears(routed, [
				...(clear ?? []),
				...emptyLeafPaths(remapped),
			]),
		};
	});
	return serialize(blocks);
};
