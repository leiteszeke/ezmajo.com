import {
	applyOwnedSection,
	collectOwnedPaths,
	purgeOwnedPaths,
} from '@shared/lib/owned-globals';

const ownedSettings = ['color', 'custom'];
// Per-leaf, so grading a heading's colour leaves its typography to the vibe layer.
const ownedStyles = ['color', 'elements', 'blocks'];

// A palette may declare a fontFamily leaf; the fonts layer owns it.
const isExcludedPath = (_section, path) =>
	path[path.length - 1] === 'fontFamily';

export const ownedPaletteSettingPaths = (palettes) =>
	collectOwnedPaths({
		payloads: palettes,
		section: 'settings',
		roots: ownedSettings,
		exclude: isExcludedPath,
	});

export const ownedPaletteStylePaths = (palettes) =>
	collectOwnedPaths({
		payloads: palettes,
		section: 'styles',
		roots: ownedStyles,
		exclude: isExcludedPath,
	});

const leaves = (...names) =>
	Object.fromEntries(names.map((name) => [name, true]));

const buttonColor = leaves('background', 'text');

// The theme fallback fires when /api/palettes cannot answer, so no payload names these.
export const paletteShape = {
	settings: {
		color: leaves('palette', 'duotone'),
		custom: {
			color: leaves(
				'background-base',
				'background-sunken',
				'background-tint-1',
				'background-tint-1-ink',
				'background-tint-1-weak',
				'background-tint-2',
				'background-tint-2-ink',
				'background-tint-2-weak',
				'background-tint-3',
				'background-tint-3-ink',
				'background-tint-3-weak',
				'icon-ink',
				'icon-surface',
				'text-strong',
				'text-weak',
			),
			elements: {
				button: {
					color: buttonColor,
					':hover': { color: buttonColor },
					':focus': { color: buttonColor },
				},
			},
		},
	},
	styles: {
		color: leaves('text'),
		elements: { heading: { color: leaves('text') } },
		blocks: {
			'core/pullquote': {
				color: leaves('background'),
				border: leaves('color'),
			},
			'core/separator': { color: leaves('text') },
		},
	},
};

export const purgePaletteGlobals = ({ settings, styles }) => ({
	settings: purgeOwnedPaths(settings, ownedPaletteSettingPaths([paletteShape])),
	styles: purgeOwnedPaths(styles, ownedPaletteStylePaths([paletteShape])),
});

export const applyPaletteGlobals = ({
	currentSettings,
	paletteSettings,
	palettes,
}) =>
	applyOwnedSection(
		currentSettings,
		paletteSettings,
		ownedPaletteSettingPaths(palettes),
	);

export const applyPaletteStyles = ({
	currentStyles,
	paletteStyles,
	palettes,
}) =>
	applyOwnedSection(
		currentStyles,
		paletteStyles,
		ownedPaletteStylePaths(palettes),
	);
