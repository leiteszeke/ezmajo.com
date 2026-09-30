import { __ } from '@wordpress/i18n';

const { themeSlug } = window.extSharedData;
const { launchCompleted } = window.extAssistData;

export default {
	slug: 'setup-tec',
	title: __('Set up events', 'extendify-local'),
	description: __(
		'Start adding events to your site by configuring The Events Calendar plugin.',
		'extendify-local',
	),
	link: 'edit.php?page=tec-events-settings&post_type=tribe_events&welcome-message-the-events-calendar=1',
	buttonLabels: {
		notCompleted: __('Set up', 'extendify-local'),
		completed: __('Revisit', 'extendify-local'),
	},
	type: 'internalLink',
	dependencies: { plugins: ['the-events-calendar'] },
	show: ({ plugins, activePlugins }) => {
		// They need either extendable or launch completed
		if (themeSlug !== 'extendable' && !launchCompleted) return false;
		if (!plugins.length) return true;

		return activePlugins.some((item) => plugins.includes(item));
	},
	backgroundImage:
		'https://images.extendify-cdn.com/assist-tasks/calendar-events.webp',
};
