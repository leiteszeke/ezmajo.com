export const extractPluginSlugs = (container) => {
	if (!container || !container.querySelectorAll) {
		return [];
	}

	const pluginSlugs = container
		.querySelectorAll('.plugin-card')
		.values()
		.map((element) => {
			// Extracts the plugin slug from the cards class.
			// The classes look like `plugin-card plugin-card-${pluginSlug}`
			const classAttr = element.getAttribute('class');
			const pluginRegex = /^plugin-card plugin-card-([\w-]*)$/;
			const pluginSlug = classAttr.match(pluginRegex)?.[1];
			return pluginSlug;
		})
		.filter(Boolean);

	// Transforming into array because `.values()` returns an iterator.
	return Array.from(pluginSlugs);
};
