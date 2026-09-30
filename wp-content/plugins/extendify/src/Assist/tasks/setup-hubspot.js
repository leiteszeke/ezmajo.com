import { __ } from '@wordpress/i18n';

const { themeSlug } = window.extSharedData;
const { launchCompleted } = window.extAssistData;

export default {
	slug: 'setup-hubspot',
	title: __('Set up HubSpot', 'extendify-local'),
	description: __(
		'Start collecting emails and marketing to your customers',
		'extendify-local',
	),
	link: 'admin.php?page=leadin',
	buttonLabels: {
		notCompleted: __('Set up', 'extendify-local'),
		completed: __('Revisit', 'extendify-local'),
	},
	type: 'internalLink',
	dependencies: { plugins: ['leadin'] },
	show: ({ plugins, activePlugins }) => {
		// They need either extendable or launch completed
		if (themeSlug !== 'extendable' && !launchCompleted) return false;
		if (!plugins.length) return true;

		return activePlugins.some((item) => plugins.includes(item));
	},
	backgroundImage: 'https://images.extendify-cdn.com/assist-tasks/hubspot.webp',
};
