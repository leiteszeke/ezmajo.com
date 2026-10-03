import { designWorkflows } from '@agent/follow-ups/design-workflows';
import { __ } from '@wordpress/i18n';

export default {
	id: 'change-site-logo',
	follows: designWorkflows,
	order: 5,
	// translators: Title of a card in the AI Agent chat, suggesting the user update their website logo.
	title: __('Update your logo', 'extendify-local'),
	// translators: Body of a card in the AI Agent chat that suggests updating the website logo.
	body: __(
		'Upload a logo that matches your design so your brand looks the same everywhere.',
		'extendify-local',
	),
	action: {
		// translators: Button on a card in the AI Agent chat that opens a tool to upload or replace the website logo.
		label: __('Change logo', 'extendify-local'),
		workflowId: 'update-logo',
	},
	score: ({ abilities }) =>
		abilities?.canEditSettings && abilities?.canUploadMedia ? 2 : 0,
};
