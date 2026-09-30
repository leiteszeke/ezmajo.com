const { pluginRecommendations = [] } = window?.extAgentData?.agentContext || {};
const { adminUrl, homeUrl } = window?.extSharedData || {};

export const getRedirectUrl = (redirectTo, options = {}) => {
	if (redirectTo?.type === 'plugin-setup') {
		const plugin = pluginRecommendations.find(
			({ slug }) => slug === options.pluginSlug,
		);
		if (!plugin) return '';
		return makeRedirectUrl(plugin.redirectTo);
	}

	return '';
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
