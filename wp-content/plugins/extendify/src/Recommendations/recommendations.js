import { PluginSearchBanner } from '@recommendations/components/PluginSearchBanner';
import domReady from '@wordpress/dom-ready';
import '@recommendations/recommendations.css';
import { render } from '@shared/lib/dom';

domReady(() => {
	// Check the current page to know what elements we need to insert.
	const currentUrl = new URL(window.location.href);
	const isPluginInstall = currentUrl.pathname.endsWith('plugin-install.php');
	const isNewPost =
		currentUrl.pathname.endsWith('post-new.php') &&
		currentUrl.searchParams.get('post_type') !== 'page';
	const isNewPage =
		currentUrl.pathname.endsWith('post-new.php') &&
		currentUrl.searchParams.get('post_type') === 'page';

	// Returns early if we are not in a page that shows recommendations.
	if (!isPluginInstall && !isNewPost && !isNewPage) {
		return;
	}

	if (isPluginInstall) {
		// The element `plugin-filter` wraps the search results,
		const pluginResults = document.getElementById('plugin-filter');

		if (pluginResults) {
			const pluginSearchContainerId = 'ext-recommendations-plugin-search';

			// If our component is already inserted, return early.
			if (document.getElementById(pluginSearchContainerId)) {
				return;
			}

			const pluginSearchContainer = Object.assign(
				document.createElement('div'),
				{
					id: pluginSearchContainerId,
					className: 'extendify-recommendations',
				},
			);

			// Inserts our component just before the plugin search results.
			pluginResults.parentNode.insertBefore(
				pluginSearchContainer,
				pluginResults,
			);

			return render(<PluginSearchBanner />, pluginSearchContainer);
		}
	}

	if (isNewPost) {
		// TODO: Implement injection of components in new post.
	}

	if (isNewPage) {
		// TODO: Implement injection of components in new page.
	}
});
