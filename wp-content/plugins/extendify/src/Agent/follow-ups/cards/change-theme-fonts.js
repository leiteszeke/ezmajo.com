import { designWorkflows } from '@agent/follow-ups/design-workflows';
import { __ } from '@wordpress/i18n';

export default {
	id: 'change-theme-fonts',
	follows: designWorkflows,
	order: 1,
	// translators: Title of a card in the AI Agent chat, suggesting the user try different fonts for their website.
	title: __('Try new fonts', 'extendify-local'),
	// translators: Body of a card in the AI Agent chat that suggests changing the website fonts.
	body: __(
		'Your design comes with font pairings to choose from. Pick one that suits your site.',
		'extendify-local',
	),
	action: {
		// translators: Button on a card in the AI Agent chat that opens a picker for the website's fonts.
		label: __('Change fonts', 'extendify-local'),
		workflowId: 'change-theme-fonts-variation',
	},
	score: ({ context, abilities }) =>
		abilities?.canEditThemes &&
		context?.hasThemeVariations &&
		Number(context?.postId)
			? 2
			: 0,
};
