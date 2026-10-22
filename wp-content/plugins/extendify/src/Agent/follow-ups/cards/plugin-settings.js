import { getPluginSetup } from '@agent/lib/redirects';
import { __, sprintf } from '@wordpress/i18n';

export default {
	id: 'plugin-settings',
	follows: ['recommend-plugins'],
	data: ({ toolCalls }) =>
		getPluginSetup(
			toolCalls.findLast(({ id }) => id === 'install-plugin')?.inputs
				?.pluginSlug,
		),
	score: ({ data }) => (data ? 3 : 0),
	content: ({ title, url }) => ({
		title: sprintf(
			// translators: Title of a card in the AI Agent chat, shown after the agent installed a plugin. %s is the plugin's name.
			__('Set up %s', 'extendify-local'),
			title,
		),
		// translators: Body of a card in the AI Agent chat, shown after the agent installed a plugin that has its own settings page.
		body: __(
			'Open its settings page to finish getting it ready.',
			'extendify-local',
		),
		action: {
			// translators: Button on a card in the AI Agent chat that opens the settings page of a plugin the agent just installed.
			label: __('Go to settings', 'extendify-local'),
			url,
			sameTab: true,
		},
	}),
};
