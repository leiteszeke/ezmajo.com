import apiFetch from '@wordpress/api-fetch';
import { __, sprintf } from '@wordpress/i18n';
import { addQueryArgs } from '@wordpress/url';

// Core's run controller 405s any verb that doesn't match these annotations.
const verbFor = (annotations) => {
	if (annotations?.readonly) return 'GET';
	if (annotations?.destructive && annotations?.idempotent) return 'DELETE';
	return 'POST';
};

// Without these, a bare run of an all-optional ability 400s — core validates
// `input` against the schema and ignores property-level defaults.
const schemaDefaults = (schema) =>
	Object.fromEntries(
		Object.entries(schema?.properties ?? {})
			.filter(([, property]) => property?.default != null)
			.map(([key, property]) => [key, property.default]),
	);

// Query strings stringify values; PHP treats "false" as truthy, "0" as falsy.
const encodeBooleans = (value) => {
	if (typeof value === 'boolean') return value ? 1 : 0;
	if (Array.isArray(value)) return value.map(encodeBooleans);
	if (value && typeof value === 'object')
		return Object.fromEntries(
			Object.entries(value).map(([k, v]) => [k, encodeBooleans(v)]),
		);
	return value;
};

export default async ({ ability, input }) => {
	const descriptor = (window.extAgentData?.wpAbilities ?? [])
		.flatMap((category) => category.abilities ?? [])
		.find((a) => a.name === ability);
	if (!descriptor?.runHref) {
		// translators: %s is the machine name of a WordPress ability the agent tried to run.
		throw new Error(
			sprintf(__('Ability "%s" is not available.', 'extendify-local'), ability),
		);
	}

	// Optional inputs the model didn't fill come through as null at any depth —
	// drop them so schema defaults stand in and the ability sees only real values.
	const isEmptyEntry = (value) =>
		!!value &&
		typeof value === 'object' &&
		!Array.isArray(value) &&
		!Object.keys(value).length;
	const withoutNulls = (value) => {
		// An entry the model left blank still has to satisfy the item schema.
		if (Array.isArray(value))
			return value.map(withoutNulls).filter((entry) => !isEmptyEntry(entry));
		if (value && typeof value === 'object') {
			return Object.fromEntries(
				Object.entries(value)
					.filter(([, v]) => v != null)
					.map(([k, v]) => [k, withoutNulls(v)]),
			);
		}
		return value;
	};
	const filled = withoutNulls(input ?? {});
	const provided = { ...schemaDefaults(descriptor.inputSchema), ...filled };
	const hasInput = Object.keys(provided).length > 0;

	const method = verbFor(descriptor.annotations);
	// The run controller reads `input` from the JSON body for POST, but from the
	// query string for GET/DELETE — pass it where WP will actually look.
	if (method === 'POST') {
		return await apiFetch({
			url: descriptor.runHref,
			method,
			...(hasInput && { data: { input: provided } }),
		});
	}
	return await apiFetch({
		url: hasInput
			? addQueryArgs(descriptor.runHref, { input: encodeBooleans(provided) })
			: descriptor.runHref,
		method,
	});
};
