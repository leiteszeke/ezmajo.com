import { designWorkflows } from '@agent/follow-ups/design-workflows';
import { __ } from '@wordpress/i18n';

export default {
	id: 'change-animation',
	follows: designWorkflows,
	order: 4,
	// translators: Title of a card in the AI Agent chat, suggesting the user add or change animations on their website.
	title: __('Add some motion', 'extendify-local'),
	// translators: Body of a card in the AI Agent chat that suggests changing how the website animates.
	body: __(
		'Choose how sections of your site animate into view as visitors scroll.',
		'extendify-local',
	),
	action: {
		// translators: Button on a card in the AI Agent chat that opens a picker for the website's animation.
		label: __('Change animation', 'extendify-local'),
		workflowId: 'change-animation',
	},
	score: ({ abilities }) =>
		abilities?.canEditSettings && window.ExtendableAnimations ? 2 : 0,
};
