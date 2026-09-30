import { pluginsActivation } from '../../api/pluginsActivation';

export const partitionPlugins = (available = []) => {
	const known = available
		.map((pluginData) => ({
			...pluginData,
			selected: true,
			createAccountCallback:
				pluginsActivation[pluginData.slug]?.createAccountCallback ?? null,
		}))
		.filter((plugin) => plugin.createAccountCallback);

	// The flag is optional in partner data; treating absent as ineligible hides every card.
	return {
		offered: known.filter((plugin) => plugin.eligible !== false),
		ineligible: known
			.filter((plugin) => plugin.eligible === false)
			.map((plugin) => plugin.slug),
	};
};
