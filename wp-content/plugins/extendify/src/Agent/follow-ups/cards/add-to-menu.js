import { __ } from '@wordpress/i18n';

export default {
	id: 'add-to-menu',
	follows: ['update-post-status'],
	// translators: Title of a card in the AI Agent chat, shown after the user published a page or post.
	title: __('Add it to your menu', 'extendify-local'),
	// translators: Body of a card in the AI Agent chat, shown after the user published a page or post.
	body: __(
		'Now that it is published, add it to your site menu so visitors can find it.',
		'extendify-local',
	),
	action: {
		// translators: Button on a card in the AI Agent chat that asks the agent to add the published page or post to the site menu.
		label: __('Add to menu', 'extendify-local'),
		// select-block has no example, so find-agent routes this message.
		// translators: Shown in the AI Agent chat as the user's own request, sent when they click the "Add to menu" button.
		message: __('Add this to the menu', 'extendify-local'),
	},
	// The publish confirm writes the new status into the context.
	score: ({ context }) => (context?.postStatus === 'publish' ? 1 : 0),
};
