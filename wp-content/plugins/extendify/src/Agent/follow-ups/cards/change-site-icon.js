import { designWorkflows } from '@agent/follow-ups/design-workflows';
import { __ } from '@wordpress/i18n';

export default {
	id: 'change-site-icon',
	follows: designWorkflows,
	order: 6,
	// translators: Title of a card in the AI Agent chat, suggesting the user set the small icon browsers show for their website.
	title: __('Set a browser icon', 'extendify-local'),
	// translators: Body of a card in the AI Agent chat about the website's browser icon (favicon).
	body: __(
		'The small icon in browser tabs and bookmarks helps people spot your site.',
		'extendify-local',
	),
	action: {
		// translators: Button on a card in the AI Agent chat that opens a tool to upload the website's browser icon.
		label: __('Change icon', 'extendify-local'),
		workflowId: 'update-site-icon',
	},
	score: ({ abilities }) =>
		abilities?.canEditSettings && abilities?.canUploadMedia ? 2 : 0,
};
