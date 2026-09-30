import {
	ownedPaletteSettingPaths,
	ownedPaletteStylePaths,
} from '@shared/lib/palette-globals';
import { isObject } from '@shared/lib/utils';

const headings = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'];

const elementSelectors = {
	body: 'body',
	button: '.wp-element-button, .wp-block-button__link',
	caption: '.wp-element-caption',
	cite: 'cite',
	link: 'a:where(:not(.wp-element-button))',
};

const cssProperties = {
	'color.text': 'color',
	'color.background': 'background-color',
	'color.gradient': 'background',
	'border.color': 'border-color',
};

const kebab = (property) =>
	property.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);

// Core names the vars via _wp_to_kebab_case, which drops the ':' from :hover.
const wpKebab = (key) =>
	kebab(key)
		.replace(/[^a-z0-9-]+/gi, '-')
		.replace(/-+/g, '-')
		.replace(/^-|-$/g, '');

const valueAt = (source, path) =>
	path.reduce(
		(value, key) => (isObject(value) ? value[key] : undefined),
		source,
	);

// theme.json stores preset references as var:preset|color|primary.
const cssValue = (value) =>
	typeof value === 'string' && value.startsWith('var:')
		? `var(--wp--${value.slice(4).split('|').map(kebab).join('--')})`
		: value;

// revert alone would drop the theme's own value with the outgoing palette's.
const resetValue = (value) =>
	typeof value === 'string' || typeof value === 'number'
		? cssValue(value)
		: 'revert';

const blockSelector = (block) => {
	const [namespace, name] = block.split('/');
	return namespace === 'core'
		? `.wp-block-${name}`
		: `.wp-block-${namespace}-${name}`;
};

const presetGroups = {
	palette: { var: 'color', value: 'color' },
	gradients: { var: 'gradient', value: 'gradient' },
};

// A palette lists its presets plainly; WP keys its own theme data by origin.
const presetList = (settings, group) => {
	const presets = valueAt(settings, ['color', group]);
	return Array.isArray(presets) ? presets : (presets?.theme ?? []);
};

const presetValue = (settings, group, slug, key) =>
	presetList(settings, group).find((entry) => entry?.slug === slug)?.[key];

const presetSlugs = (palettes, group) => {
	const slugs = new Set();

	for (const palette of Object.values(palettes ?? {})) {
		for (const entry of presetList(palette?.settings, group)) {
			if (entry?.slug) slugs.add(entry.slug);
		}
	}

	return [...slugs];
};

// Returning [] rather than null would hide an unmapped leaf from the guard.
const settingSlots = (path, palettes) => {
	const [root, group] = path;

	// The svg filter carries the duotone, so there is no var to write.
	if (root === 'color' && group === 'duotone') return [];

	if (root === 'color' && presetGroups[group]) {
		const { var: name, value } = presetGroups[group];
		return presetSlugs(palettes, group).map((slug) => ({
			selector: ':root',
			property: `--wp--preset--${name}--${wpKebab(slug)}`,
			read: (settings) => presetValue(settings, group, slug, value),
		}));
	}

	if (root !== 'custom') return null;

	return [
		{
			selector: ':root',
			property: `--wp--${path.map(wpKebab).join('--')}`,
			read: (settings) => valueAt(settings, path),
		},
	];
};

const styleSlots = (path) => {
	if (path[0] === 'elements') {
		const [, element, ...rest] = path;
		const pseudo = rest[0]?.startsWith(':') ? rest[0] : '';
		const property = cssProperties[rest.slice(pseudo ? 1 : 0).join('.')];
		if (!property) return null;

		if (element !== 'heading') {
			return [
				{
					selector: `:root :where(${elementSelectors[element] ?? element})${pseudo}`,
					property,
					read: (styles) => valueAt(styles, path),
				},
			];
		}

		// Resolved per level so a theme's own h5 colour survives the reset.
		return headings.map((level) => ({
			selector: `:root :where(${level})${pseudo}`,
			property,
			read: (styles) =>
				valueAt(styles, ['elements', level, ...rest]) ??
				valueAt(styles, ['elements', 'heading', ...rest]),
		}));
	}

	if (path[0] === 'blocks') {
		const [, block, ...rest] = path;
		const property = cssProperties[rest.join('.')];
		if (!property) return null;

		return [
			{
				selector: `:root :where(${blockSelector(block)})`,
				property,
				read: (styles) => valueAt(styles, path),
			},
		];
	}

	const property = cssProperties[path.join('.')];
	if (!property) return null;

	return [
		{
			selector: ':root :where(body)',
			property,
			read: (styles) => valueAt(styles, path),
		},
	];
};

const paletteSlots = (palettes) => {
	const slots = [];
	const covered = [];

	for (const path of ownedPaletteSettingPaths(palettes)) {
		const built = settingSlots(path, palettes);
		if (built === null) continue;
		covered.push(`settings.${path.join('.')}`);
		slots.push(...built.map((slot) => ({ ...slot, section: 'settings' })));
	}

	for (const path of ownedPaletteStylePaths(palettes)) {
		const built = styleSlots(path);
		if (built === null) continue;
		covered.push(`styles.${path.join('.')}`);
		slots.push(...built.map((slot) => ({ ...slot, section: 'styles' })));
	}

	return { slots, covered };
};

export const paletteResetScope = (palettes) =>
	paletteSlots(palettes).covered.sort();

// An older backend wraps this list by origin.
export const paletteDuotone = (palette) => {
	const duotone = palette?.settings?.color?.duotone;
	return Array.isArray(duotone) ? duotone : duotone?.theme;
};

const cssFromSlots = ({ slots, incoming, themeStyles, themeSettings }) => {
	const rules = new Map();

	for (const { selector, property, section, read } of slots) {
		const settings = section === 'settings';
		const value = read(settings ? incoming?.settings : incoming?.styles);
		const declarations = rules.get(selector) ?? [];

		declarations.push(
			`${property}:${
				value === undefined
					? resetValue(read(settings ? themeSettings : themeStyles))
					: cssValue(value)
			}`,
		);
		rules.set(selector, declarations);
	}

	let css = '';
	for (const [selector, declarations] of rules) {
		css += `${selector}{${declarations.join(';')};}`;
	}

	return css;
};

// A palette carries no compiled css, unlike a variation or a vibe.
export const buildPaletteCss = ({
	payloads,
	slug,
	themeStyles,
	themeSettings,
}) =>
	cssFromSlots({
		slots: paletteSlots(payloads).slots,
		incoming: payloads?.[slug],
		themeStyles,
		themeSettings,
	});

// One slot pass for the whole set; per-slug calls make it quadratic.
export const buildPaletteCssMap = ({
	payloads,
	themeStyles,
	themeSettings,
}) => {
	const { slots } = paletteSlots(payloads);

	return Object.fromEntries(
		Object.entries(payloads ?? {}).map(([slug, incoming]) => [
			slug,
			cssFromSlots({ slots, incoming, themeStyles, themeSettings }),
		]),
	);
};
