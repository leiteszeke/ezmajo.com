import { deepMerge, isObject } from '@shared/lib/utils';
import { ownedSettingPaths, ownedStylePaths } from '@shared/lib/vibe-globals';

const headings = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'];

const kebab = (property) =>
	property.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);

// Core's selectors for theme.json elements; heading resolves per level.
const elementSelectors = {
	body: 'body',
	button: '.wp-element-button, .wp-block-button__link',
	caption: '.wp-element-caption',
	cite: 'cite',
	link: 'a:where(:not(.wp-element-button))',
};

const blockSelector = (block) => {
	const [namespace, name] = block.split('/');
	return namespace === 'core'
		? `.wp-block-${name}`
		: `.wp-block-${namespace}-${name}`;
};

// Property paths that don't kebab straight into their css property.
const propertyAliases = {
	'color.background': 'background-color',
	'color.text': 'color',
	'color.gradient': 'background',
	'filter.duotone': 'filter',
	shadow: 'box-shadow',
	'border.radius.topLeft': 'border-top-left-radius',
	'border.radius.topRight': 'border-top-right-radius',
	'border.radius.bottomLeft': 'border-bottom-left-radius',
	'border.radius.bottomRight': 'border-bottom-right-radius',
};

// typography.fontSize is font-size, but border.radius keeps its group.
const grouplessRoots = new Set(['typography', 'spacing', 'dimensions']);

const cssProperty = (path) =>
	propertyAliases[path.join('.')] ??
	(grouplessRoots.has(path[0]) ? path.slice(1) : path).map(kebab).join('-');

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

// revert alone would drop the theme's own value with the outgoing vibe's.
const resetValue = (value) =>
	typeof value === 'string' || typeof value === 'number'
		? cssValue(value)
		: 'revert';

const setDeclarations = (rules, key, text) => {
	for (const declaration of text.split(';')) {
		const [name, ...value] = declaration.split(':');
		const property = name.trim();
		if (!/^-?[a-zA-Z][-a-zA-Z]*$/.test(property) || !value.length) continue;
		const declarations = rules.get(key) ?? new Map();
		declarations.set(property, value.join(':').trim());
		rules.set(key, declarations);
	}
};

const cssRuleMap = (css) => {
	const rules = new Map();
	if (typeof css !== 'string') return rules;

	let topLevel = '';
	let lastIndex = 0;
	for (const match of css.matchAll(/([^{};]*)\{([^{}]*)\}/g)) {
		topLevel += css.slice(lastIndex, match.index);
		lastIndex = match.index + match[0].length;
		setDeclarations(rules, match[1].trim().replace(/\s+/g, ' '), match[2]);
	}
	setDeclarations(rules, '', topLevel + css.slice(lastIndex));

	return rules;
};

// Core emits block custom css at raw specificity; a fully :where-wrapped reset loses.
const nestedSelector = (blockSel, nested) =>
	nested
		.split(',')
		.map((part) => {
			const trimmed = part.trim().replace(/\s+/g, ' ');
			if (!trimmed) return `:root :where(${blockSel})`;
			return trimmed.includes('&')
				? `:root ${trimmed.replace(/&/g, `:where(${blockSel})`)}`
				: `:root :where(${blockSel}) ${trimmed}`;
		})
		.join(', ');

const addSlot = (slots, selector, property, resolve) =>
	slots.set(`${selector}|${property}`, { selector, property, resolve });

const addCssSlots = (slots, blockSel, css, path) => {
	for (const [nested, declarations] of cssRuleMap(css)) {
		const selector = nested
			? nestedSelector(blockSel, nested)
			: `:root :where(${blockSel})`;
		for (const property of declarations.keys()) {
			addSlot(slots, selector, property, (theme) =>
				cssRuleMap(valueAt(theme, path)).get(nested)?.get(property),
			);
		}
	}
};

const collectSlots = (slots, vibe) => {
	for (const path of ownedStylePaths({ vibe })) {
		if (path[0] === 'elements') {
			const [, element, ...rest] = path;
			// Resolved per level so a theme's own h5 value survives the reset.
			for (const level of element === 'heading' ? headings : [element]) {
				if (headings.includes(level)) {
					addSlot(
						slots,
						`:root :where(${level})`,
						cssProperty(rest),
						(theme) =>
							valueAt(theme, ['elements', level, ...rest]) ??
							valueAt(theme, ['elements', 'heading', ...rest]),
					);
					continue;
				}
				addSlot(
					slots,
					`:root :where(${elementSelectors[element] ?? element})`,
					cssProperty(rest),
					(theme) => valueAt(theme, path),
				);
			}
			continue;
		}

		if (path[0] === 'blocks') {
			const [, block, ...rest] = path;
			const selector = blockSelector(block);
			if (rest[rest.length - 1] === 'css') {
				addCssSlots(slots, selector, valueAt(vibe?.styles, path), path);
				continue;
			}
			addSlot(slots, `:root :where(${selector})`, cssProperty(rest), (theme) =>
				valueAt(theme, path),
			);
			continue;
		}

		addSlot(slots, ':root :where(body)', cssProperty(path), (theme) =>
			valueAt(theme, path),
		);
	}
};

const customVarPaths = (vibes) =>
	ownedSettingPaths(vibes).filter((path) => path[0] === 'custom');

// Core names the vars via _wp_to_kebab_case, which drops the ':' from :hover.
const wpKebab = (key) =>
	kebab(key)
		.replace(/[^a-z0-9-]+/gi, '-')
		.replace(/-+/g, '-')
		.replace(/^-|-$/g, '');

// Layout sizes are server-compiled fluid clamps, so settings resets stop at custom vars.
const customVarResetCss = ({ payloads, slug, themeSettings }) => {
	const incoming = new Set(
		customVarPaths({ [slug]: payloads?.[slug] }).map((path) => path.join('.')),
	);

	const declarations = customVarPaths(payloads ?? {})
		.filter((path) => !incoming.has(path.join('.')))
		.map(
			(path) =>
				`--wp--${path.map(wpKebab).join('--')}:${resetValue(
					valueAt(themeSettings, path),
				)}`,
		);

	return declarations.length ? `:root{${declarations.join(';')};}` : '';
};

// The applied fonts variation is the no-vibe baseline where it declares a value.
export const withAppliedVariation = (theme, variation) => {
	const base = isObject(theme) ? theme : {};
	return isObject(variation) ? deepMerge(base, variation) : base;
};

// Css only adds, so an incoming vibe's silence cannot undo the applied vibe's
// styles. Which vibe is applied is unknown here, so every vibe's slots get cleared.
export const buildVibeResetCss = ({
	payloads,
	slug,
	themeStyles,
	themeSettings,
}) => {
	const owned = new Map();
	for (const vibe of Object.values(payloads ?? {})) collectSlots(owned, vibe);

	const incoming = new Map();
	if (payloads?.[slug]) collectSlots(incoming, payloads[slug]);

	const rules = new Map();
	for (const [key, { selector, property, resolve }] of owned) {
		if (incoming.has(key)) continue;
		const declarations = rules.get(selector) ?? [];
		declarations.push(`${property}:${resetValue(resolve(themeStyles))}`);
		rules.set(selector, declarations);
	}

	let css = '';
	for (const [selector, declarations] of rules) {
		css += `${selector}{${declarations.join(';')};}`;
	}

	return css + customVarResetCss({ payloads, slug, themeSettings });
};
