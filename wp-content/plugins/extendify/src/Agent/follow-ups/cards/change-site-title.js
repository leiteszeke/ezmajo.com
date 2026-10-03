import { designWorkflows } from '@agent/follow-ups/design-workflows';
import { __ } from '@wordpress/i18n';

export default {
	id: 'change-site-title',
	follows: designWorkflows,
	order: 7,
	// translators: Title of a card in the AI Agent chat, suggesting the user review their website title.
	title: __('Check your website title', 'extendify-local'),
	// translators: Body of a card in the AI Agent chat, explaining where the website title appears.
	body: __(
		'Your title shows in browser tabs and search results. Make sure it says what your site is about.',
		'extendify-local',
	),
	action: {
		// translators: Button on a card in the AI Agent chat that starts changing the website title.
		label: __('Change title', 'extendify-local'),
		workflowId: 'edit-wp-setting',
	},
	score: ({ abilities }) => (abilities?.canEditSettings ? 2 : 0),
};
