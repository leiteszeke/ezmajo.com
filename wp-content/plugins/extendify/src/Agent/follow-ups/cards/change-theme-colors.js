import { designWorkflows } from '@agent/follow-ups/design-workflows';
import { __ } from '@wordpress/i18n';

export default {
	id: 'change-theme-colors',
	follows: designWorkflows,
	order: 2,
	// translators: Title of a card in the AI Agent chat, suggesting the user try a different color palette for their website.
	title: __('Try a new color palette', 'extendify-local'),
	// translators: Body of a card in the AI Agent chat that suggests changing the website colors.
	body: __(
		'Your design comes with color palettes to choose from. Pick one that fits your brand.',
		'extendify-local',
	),
	action: {
		// translators: Button on a card in the AI Agent chat that opens a picker for the website's color palette.
		label: __('Change colors', 'extendify-local'),
		workflowId: 'change-theme-variation',
	},
	score: ({ context, abilities }) =>
		abilities?.canEditThemes &&
		context?.hasThemeVariations &&
		Number(context?.postId)
			? 2
			: 0,
};
