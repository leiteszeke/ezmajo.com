import { Redirect } from '@agent/workflows/theme/components/Redirect';
import { __ } from '@wordpress/i18n';
import { layout } from '@wordpress/icons';
import { SelectSiteDesign } from './components/change-site-design/SelectSiteDesign';

const { context, abilities } = window.extAgentData;

const workflow = {
	available: () =>
		abilities?.canEditThemes &&
		!context?.adminPage &&
		context?.postId &&
		!context?.isBlogPage &&
		context?.isBlockTheme,
	needsRedirect: () => !context?.isFrontPage,
	redirectComponent: () =>
		Redirect(
			__(
				'It looks like you are trying to change your site design, but you are not on a page where we can do that.',
				'extendify-local',
			),
		),
	id: 'change-site-design',
	whenFinished: {
		component: SelectSiteDesign,
	},
	example: {
		text: __('Change website design', 'extendify-local'),
		agentResponse: {
			// translators: This message show above a UI where the user can select a different site design.
			reply: __(
				'Below you can select a different design for your website.',
				'extendify-local',
			),
			recommendations: [
				{
					id: 'change-theme-colors',
					icon: 'styles',
					label: __('Change website colors', 'extendify-local'),
					workflowId: 'change-theme-variation',
					available: { context: ['hasThemeVariations'] },
				},
				{
					id: 'change-site-title',
					icon: 'edit',
					label: __('Change website title', 'extendify-local'),
					workflowId: 'edit-wp-setting',
					available: { abilities: ['canEditSettings'] },
				},
				{
					id: 'change-website-logo',
					icon: 'siteLogo',
					label: __('Change website logo', 'extendify-local'),
					workflowId: 'update-logo',
					available: { abilities: ['canEditSettings', 'canUploadMedia'] },
				},
			],
			whenFinishedTool: {
				id: 'change-site-design',
				labels: {
					confirm: __('Updated the website design', 'extendify-local'),
					cancel: __('Canceled the website design update', 'extendify-local'),
				},
			},
		},
	},
	icon: layout,
};

export default workflow;
