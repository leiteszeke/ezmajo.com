import apiFetch from '@wordpress/api-fetch';
import { __ } from '@wordpress/i18n';
import { addQueryArgs } from '@wordpress/url';

export const getSiteStyle = async () => {
	const siteStyles = await apiFetch({
		method: 'GET',
		path: addQueryArgs('/extendify/v1/page-creator/settings/get-option', {
			name: 'extendify_siteStyle',
		}),
	});

	if (siteStyles) return siteStyles;

	return { vibe: 'standard' };
};

export const updateOption = async (option, value) =>
	await apiFetch({
		path: '/extendify/v1/page-creator/settings/single',
		method: 'POST',
		data: { key: option, value },
	});

export const processPlaceholders = (patterns) =>
	apiFetch({
		path: '/extendify/v1/shared/process-placeholders',
		method: 'POST',
		data: { patterns },
	});

export const updatePageTitlePattern = (pageTitlePattern) => {
	const templateContent = `
		<!-- wp:template-part {"slug":"header","tagName":"header"} /-->
		<!-- wp:group {"tagName":"main","style":{"spacing":{"margin":{"top":"0px","bottom":"0px"},"blockGap":"0"}}} -->
		<main class="wp-block-group" style="margin-top:0px;margin-bottom:0px">
			${pageTitlePattern}
			<!-- wp:post-content {"layout":{"type":"constrained"}} /-->
		</main>
		<!-- /wp:group -->
		<!-- wp:template-part {"slug":"footer","tagName":"footer"} /-->
		`;

	return apiFetch({
		path: '/wp/v2/templates/extendable/page-with-title',
		method: 'POST',
		data: {
			slug: 'page-with-title',
			theme: 'extendable',
			type: 'wp_template',
			status: 'publish',
			description: __('Added by Launch', 'extendify-local'),
			content: templateContent,
		},
	});
};

export const getActivePlugins = async () =>
	await apiFetch({
		path: '/extendify/v1/launch/active-plugins',
		method: 'GET',
	});
