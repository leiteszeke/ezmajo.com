import {
	applyOwnedSection,
	collectOwnedPaths,
} from '@shared/lib/owned-globals';

const ownedSettings = ['layout', 'typography', 'custom'];
// Per-leaf, so clearing a heading size leaves fontFamily to the fonts layer.
// WordPress reads duotone per block name, never per variation, so blocks is owned here.
const ownedStyles = ['typography', 'elements', 'blocks'];

// The fonts and palette layers own these; a declaring payload is ignored.
const isExcludedPath = (section, path) => {
	if (path[path.length - 1] === 'fontFamily') return true;
	if (section !== 'settings') return false;
	if (path[0] === 'color') return true;
	return path[0] === 'typography' && path[1] === 'fontFamilies';
};

export const ownedSettingPaths = (vibes) =>
	collectOwnedPaths({
		payloads: vibes,
		section: 'settings',
		roots: ownedSettings,
		exclude: isExcludedPath,
	});

export const ownedStylePaths = (vibes) =>
	collectOwnedPaths({
		payloads: vibes,
		section: 'styles',
		roots: ownedStyles,
		exclude: isExcludedPath,
	});

export const applyVibeGlobals = ({ currentSettings, vibeSettings, vibes }) =>
	applyOwnedSection(currentSettings, vibeSettings, ownedSettingPaths(vibes));

export const applyVibeStyles = ({ currentStyles, vibeStyles, vibes }) =>
	applyOwnedSection(currentStyles, vibeStyles, ownedStylePaths(vibes));

// A fonts or colors write may not move vibe-owned leaves.
export const preserveVibeSettings = ({
	mergedSettings,
	currentSettings,
	vibes,
}) =>
	applyOwnedSection(mergedSettings, currentSettings, ownedSettingPaths(vibes));

export const preserveVibeStyles = ({ mergedStyles, currentStyles, vibes }) =>
	applyOwnedSection(mergedStyles, currentStyles, ownedStylePaths(vibes));

// natural-1 is what the theme ships, so writing it would only restate the theme.
export const vibeGlobalsEntry = (vibes, selectedVibe) =>
	selectedVibe === 'natural-1' ? undefined : vibes?.[selectedVibe];
