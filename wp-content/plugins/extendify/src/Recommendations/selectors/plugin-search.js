const { products = [] } = window.extSharedData;

export const selectIsLoading = (state) =>
	state.isSearchPluginsLoading || state.isInstalledPluginsLoading;

export const selectIsError = (state) =>
	state.isSearchPluginsError || state.isInstalledPluginsError;

export const selectAllRecommendations = (state) => {
	const triggeredBySlug = new Map();
	const { searchPlugins, installedPlugins, searchPluginsLimit } = state;
	const activePlugins = installedPlugins.filter(
		({ status }) => status === 'active',
	);
	const limitedSearchPlugins = searchPlugins.slice(0, searchPluginsLimit);

	// We filter out products that:
	const recommendations = products
		// 1. Are not enabled for this slot.
		.filter((product) => product.slots.includes('plugin-search'))
		// 2. Are not triggering a match in plugin search results.
		.filter((product) =>
			product.pluginSearchTriggerSlugs.some((triggerSlug) => {
				// We only compare against the results up to the set limit.
				const included = limitedSearchPlugins.includes(triggerSlug);
				if (included) {
					triggeredBySlug.set(product.slug, triggerSlug);
				}
				return included;
			}),
		)
		// 3. Are plugins and are already installed.
		.filter(
			(product) =>
				product.ctaType !== 'plugin' ||
				!installedPlugins.find(({ slug }) => slug === product.ctaPluginSlug),
		)
		// 4. Are excluded because a specified plugin is already active.
		.filter((product) =>
			product.pluginExclusions.every(
				(pluginExclusion) =>
					!activePlugins.find(({ slug }) => slug === pluginExclusion),
			),
		)
		// 5. Are excluded because a plugin dependency is not installed.
		.filter((product) =>
			product.pluginDependencies.every((pluginDependency) =>
				installedPlugins.find(({ slug }) => slug === pluginDependency),
			),
		)
		.filter(Boolean)
		.map((product) => ({
			...product,
			title: product.pluginSearchCustomTitle || product.title,
			description: product.pluginSearchCustomDescription || product.description,
			ctaContent: product.pluginSearchCustomCtaContent || product.ctaContent,
			triggerContent: triggeredBySlug.get(product.slug),
			triggerType: 'plugin-slug',
		}))
		// Sort recommendations based on the order of their trigger slugs in the search results.
		.sort(
			(a, b) =>
				limitedSearchPlugins.indexOf(a.triggerContent) -
				limitedSearchPlugins.indexOf(b.triggerContent),
		);

	return recommendations;
};

export const selectRecommendations = (state) => {
	const recommendations = selectAllRecommendations(state);
	return recommendations.slice(0, state.recommendationsLimit);
};

export const selectSearchPlugins = (state) =>
	state.searchPlugins.slice(0, state.searchPluginsLimit);

export const selectInstalledPlugins = (state) =>
	state.installedPlugins.map((plugin) => plugin.slug);

export const selectActivePlugins = (state) =>
	state.installedPlugins
		.filter((plugin) => plugin.status === 'active')
		.map((plugin) => plugin.slug);
