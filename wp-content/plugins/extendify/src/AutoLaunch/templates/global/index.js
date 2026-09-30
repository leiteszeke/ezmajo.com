import { DEFAULT_SHADER } from '@auto-launch/functions/shader-canvas';
import background from './background.json';
import brand from './brand.json';
import color from './color.json';
import layout from './layout.json';
import shape from './shape.json';
import type from './type.json';

/**
 * The GLSL default is spliced in rather than sitting in the JSON: the flow
 * compiles that string, and a second copy is one that drifts from it.
 *
 * `layout` is advisory: a template may arrange with it or ignore it.
 */
export const globalManifests = () => [
	brand,
	color,
	shape,
	type,
	layout,
	{
		...background,
		properties: {
			...background.properties,
			bgSource: { ...background.properties.bgSource, default: DEFAULT_SHADER },
		},
	},
];

// A design overrides at this same key, so the default is the only theme.
export const globalDefault = (key) =>
	globalManifests().find((manifest) => manifest.properties[key])?.properties[
		key
	].default;
