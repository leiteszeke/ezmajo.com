const { pluginRecommendations = [] } = window?.extAgentData?.agentContext || {};
const { adminUrl, homeUrl } = window?.extSharedData || {};

export const getPluginSetup = (pluginSlug) => {
	const plugin = pluginRecommendations.find(({ slug }) => slug === pluginSlug);
	if (!plugin?.redirectTo) return null;
	const url = makeRedirectUrl(plugin.redirectTo);
	return url ? { title: plugin.title, url } : null;
};

const makeRedirectUrl = (url) => {
	try {
		return new URL(
			url.replace('{{ADMIN_URL}}', adminUrl).replace('{{HOME_URL}}', homeUrl),
		).toString();
	} catch (e) {
		console.error(e);
		return '';
	}
};
