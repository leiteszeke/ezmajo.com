import { __ } from '@wordpress/i18n';

export default {
	id: 'publish-page',
	follows: [
		'create-page',
		'edit-post-strings',
		'edit-post-strings-editor',
		'block-general',
		'block-patching',
		'select-block',
	],
	// translators: Title of a card in the AI Agent chat, shown after the user edited a page that is still a draft.
	title: __('Ready to publish?', 'extendify-local'),
	// translators: Body of a card in the AI Agent chat, shown after the user edited a page that is still a draft.
	body: __(
		'This page is still a draft. Publish it so visitors can see it.',
		'extendify-local',
	),
	action: {
		// translators: Button on a card in the AI Agent chat that opens a confirmation to publish the current page.
		label: __('Publish page', 'extendify-local'),
		workflowId: 'update-post-status',
	},
	score: ({ context, abilities }) =>
		abilities?.canEditPosts &&
		!context?.adminPage &&
		context?.postId &&
		context?.postStatus === 'draft'
			? 2
			: 0,
};
