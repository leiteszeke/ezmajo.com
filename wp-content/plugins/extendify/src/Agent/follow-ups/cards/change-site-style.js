import { designWorkflows } from '@agent/follow-ups/design-workflows';
import { __ } from '@wordpress/i18n';

export default {
	id: 'change-site-style',
	follows: designWorkflows,
	order: 3,
	// translators: Title of a card in the AI Agent chat. "Style" refers to the structural aesthetic style of the website.
	title: __('Try a different style', 'extendify-local'),
	// translators: Body of a card in the AI Agent chat. "Style" refers to the structural aesthetic style of the website.
	body: __(
		'Each style changes the overall feel of your site while keeping your content.',
		'extendify-local',
	),
	action: {
		// translators: Button on a card in the AI Agent chat that opens a picker for the website's style.
		label: __('Change style', 'extendify-local'),
		workflowId: 'change-site-vibes',
	},
	score: ({ context, abilities }) =>
		abilities?.canEditThemes &&
		context?.hasThemeVariations &&
		context?.isUsingVibes &&
		Number(context?.postId)
			? 2
			: 0,
};
