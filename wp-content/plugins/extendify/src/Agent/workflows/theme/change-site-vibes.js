import { Redirect } from '@agent/workflows/theme/components/Redirect';
import { SelectSiteVibes } from '@agent/workflows/theme/components/SelectSiteVibes';
import { __ } from '@wordpress/i18n';
import { brush } from '@wordpress/icons';

const { context, abilities } = window.extAgentData;

export default {
	available: () =>
		abilities?.canEditThemes &&
		context?.hasThemeVariations &&
		context?.isUsingVibes,
	needsRedirect: () => !Number(context?.postId || 0),
	redirectComponent: () =>
		Redirect(
			// translators: "site style" refers to the structural aesthetic style for the site.
			__(
				'It looks like you are trying to change your site style, but you are not on a page where we can do that.',
				'extendify-local',
			),
		),
	id: 'change-site-vibes',
	whenFinished: { component: SelectSiteVibes },
	example: {
		// translators: "site style" refers to the structural aesthetic style for the site.
		text: __('Change website style', 'extendify-local'),
		agentResponse: {
			// translators: This message show above a UI where the user can select a different site style variation for their theme.
			reply: __(
				'Below you can select a different site style variation for your theme.',
				'extendify-local',
			),
			whenFinishedTool: {
				id: 'update-site-vibes',
				labels: {
					confirm: __('Updated the website style', 'extendify-local'),
					cancel: __('Canceled the website style update', 'extendify-local'),
				},
			},
		},
	},
	icon: brush,
};
