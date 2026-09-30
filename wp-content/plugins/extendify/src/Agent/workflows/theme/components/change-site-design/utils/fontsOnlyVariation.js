const typographyOnly = (elements) =>
	Object.fromEntries(
		Object.entries(elements ?? {})
			.filter(([, styles]) => styles?.typography)
			.map(([element, styles]) => [element, { typography: styles.typography }]),
	);

// The palette owns colour, so an option may only contribute its font leaves.
export const fontsOnlyVariation = (variation) => {
	const { typography, elements } = variation?.styles ?? {};
	const fonts = typographyOnly(elements);

	return {
		styles: {
			...(typography ? { typography } : {}),
			...(Object.keys(fonts).length ? { elements: fonts } : {}),
		},
	};
};
