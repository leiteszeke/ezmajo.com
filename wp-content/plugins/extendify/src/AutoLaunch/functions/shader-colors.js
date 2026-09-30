import { colord } from 'colord';

// Used when a design sets no background color of its own.
export const derivedShaderColors = (page, action) => {
	const ground = colord(page);
	const act = colord(action);
	const primary = ground.isLight()
		? act.desaturate(0.3)
		: ground.desaturate(0.3).lighten(0.4);
	return [
		primary.toHex(),
		act.desaturate(0.2).lighten(0.2).toHex(),
		ground.rotate(30).lighten(0.3).toHex(),
	];
};
