import { isObject } from '@shared/lib/utils';

const leafPaths = (value, prefix) => {
	// An empty object, or PHP's [] for one, would purge the whole branch.
	if (Array.isArray(value) && value.length === 0) return [];
	if (!isObject(value)) return [prefix];

	const entries = Object.entries(value);
	if (entries.length === 0) return [];

	return entries.flatMap(([key, child]) => leafPaths(child, [...prefix, key]));
};

export const collectOwnedPaths = ({ payloads, section, roots, exclude }) => {
	const paths = new Map();

	for (const payload of Object.values(payloads ?? {})) {
		const source = payload?.[section];
		if (!isObject(source)) continue;

		for (const key of roots) {
			if (!(key in source)) continue;

			for (const path of leafPaths(source[key], [key])) {
				if (exclude?.(section, path)) continue;
				paths.set(path.join('.'), path);
			}
		}
	}

	return [...paths.values()];
};

const valueAtPath = (source, path) =>
	path.reduce(
		(value, key) => (isObject(value) ? value[key] : undefined),
		source,
	);

const withoutPath = (source, [key, ...rest]) => {
	if (!isObject(source) || !(key in source)) return source;

	const updated = { ...source };

	if (rest.length === 0) {
		delete updated[key];
		return updated;
	}

	const child = withoutPath(updated[key], rest);

	if (isObject(child) && Object.keys(child).length === 0) {
		delete updated[key];
	} else {
		updated[key] = child;
	}

	return updated;
};

const withPath = (source, [key, ...rest], value) => {
	const updated = isObject(source) ? { ...source } : {};
	updated[key] =
		rest.length === 0 ? value : withPath(updated[key], rest, value);
	return updated;
};

export const purgeOwnedPaths = (section, ownedPaths) =>
	ownedPaths.reduce((current, path) => withoutPath(current, path), section);

// Purging first is what stops the outgoing payload's leaves surviving a switch.
export const applyOwnedSection = (current, incoming, ownedPaths) => {
	const purged = purgeOwnedPaths(current, ownedPaths);

	if (!isObject(incoming)) return purged;

	return ownedPaths.reduce((section, path) => {
		const value = valueAtPath(incoming, path);
		return value === undefined ? section : withPath(section, path, value);
	}, purged);
};
