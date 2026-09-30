/**
 * JSON Schema describes the value; the x- keywords describe what it has no
 * opinion about — a key's widget, its grouping and the panel's own labels.
 */
const CONTROL_KEYS = {
	'x-card': 'card',
	'x-label': 'label',
	'x-control': 'type',
	'x-feeds': 'feeds',
	'x-options': 'options',
	'x-unlocks': 'unlocks',
	'x-lockedBy': 'lockedBy',
	'x-inherits': 'inherits',
	'x-placeholder': 'placeholder',
	'x-note': 'note',
	'x-unit': 'unit',
};

// A length is `12px` at rest and 12 in the input, so the bounds describe the number.
const CSS_UNIT = { length: 'px', em: 'em' };

const withUnit = (number, unit) =>
	unit && number !== undefined ? `${number}${unit}` : number;

const withoutUnit = (value, unit) =>
	unit && typeof value === 'string' && value.endsWith(unit)
		? value.slice(0, -unit.length)
		: value;

// A value failing its schema becomes the bound or the default, never the page.
export const coerce = (shape, value) => {
	if (value === undefined || value === null || value === '') return value;
	if (shape.enum && !shape.enum.includes(value)) return shape.default;
	if (shape.type === 'number') {
		const unit = CSS_UNIT[shape['x-control']];
		const number = Number(withoutUnit(value, unit));
		if (Number.isNaN(number)) return withUnit(shape.default, unit);
		if (shape.minimum !== undefined && number < shape.minimum) {
			return withUnit(shape.minimum, unit);
		}
		if (shape.maximum !== undefined && number > shape.maximum) {
			return withUnit(shape.maximum, unit);
		}
		return withUnit(number, unit);
	}
	if (shape.type === 'string' && typeof value !== 'string')
		return shape.default;
	return value;
};

export const controlsFrom = (manifest) =>
	Object.entries(manifest.properties ?? {}).map(([key, shape]) => {
		const control = { key };
		if (key.startsWith('--')) control.cssVar = key;
		for (const [source, target] of Object.entries(CONTROL_KEYS)) {
			if (shape[source] !== undefined) control[target] = shape[source];
		}
		if (shape.default !== undefined) control.defaultValue = shape.default;
		if (shape.enum !== undefined) control.enum = shape.enum;
		if (shape.minimum !== undefined) control.min = shape.minimum;
		if (shape.maximum !== undefined) control.max = shape.maximum;
		if (shape.multipleOf !== undefined) control.step = shape.multipleOf;
		control.coerce = (value) => coerce(shape, value);
		return control;
	});

export const idOf = (manifest) => manifest.$id.split('/').pop();

/**
 * Global, then the page, then the template. A level restates only what it
 * changes — a different default still inherits the type and the bounds.
 */
export const mergeManifests = (manifests) => {
	const properties = {};
	for (const manifest of manifests) {
		for (const [key, shape] of Object.entries(manifest.properties ?? {})) {
			properties[key] = { ...properties[key], ...shape };
		}
	}
	return { properties };
};
