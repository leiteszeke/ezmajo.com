/**
 * Converts a comma-separated parameter string into an array of valid values,
 * removing duplicates and discarding anything not in the allowed list.
 *
 * @param {string|null} params - A comma-separated string of parameters (e.g. "info,pages,layout").
 *                               May be null or empty.
 * @param {string[]} allowedItems - List of allowed values (e.g. ["questions", "info", "layout", "pages"]).
 * @returns {string[]} - An array of unique, valid values. Returns [] if no valid values are found.
 *
 * @example
 * convertToValidParamsArray("info, pages,invalid", ["info","pages"]);
 * // => ["info", "pages"]
 */
export const convertToValidParamsArray = (params, allowedItems) => {
	if (!params || !allowedItems?.length) return [];

	return Array.from(
		new Set(
			params
				.split(',')
				.map((item) => item.trim())
				.filter((item) => allowedItems.includes(item)),
		),
	);
};

/**
 * Converts a comma-separated parameter string into a normalized string,
 * keeping only allowed values, removing duplicates, and joining them back
 * into a single string.
 *
 * @param {string|null} params - A comma-separated string of parameters (e.g. "info,pages,layout").
 *                               May be null or empty.
 * @param {string[]} allowedItems - List of allowed values (e.g. ["questions", "info", "layout", "pages"]).
 * @returns {string} - A comma-separated string of valid, unique values. Returns "" if no valid values are found.
 *
 * @example
 * convertToValidParamsString("info, pages,invalid", ["info","pages"]);
 * // => "info,pages"
 */
export const convertToValidParamsString = (params, allowedItems) => {
	return convertToValidParamsArray(params, allowedItems).join(',');
};

/**
 * Maps tone string values to their matching objects in the allowed list.
 *
 * - Filters out invalid values.
 * - Preserves input order and duplicates.
 *
 * @param {string[]|null|undefined} values - Tone values to map.
 * @param {{label: string, value: string}[]} allowed - Allowed tone objects.
 * @returns {{label: string, value: string}[]} Matching tone objects.
 */
export const mapToneValuesToObjects = (siteToneParam, allowedTonesObject) => {
	if (!Array.isArray(siteToneParam) || siteToneParam.length === 0) return [];

	return siteToneParam
		.map((tone) => allowedTonesObject.find((t) => t.value === tone))
		.filter(Boolean);
};
