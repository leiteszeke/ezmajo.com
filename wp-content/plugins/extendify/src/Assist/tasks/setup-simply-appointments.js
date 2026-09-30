import { __ } from '@wordpress/i18n';

const { themeSlug } = window.extSharedData;
const { launchCompleted } = window.extAssistData;

export default {
	slug: 'setup-simply-appointments',
	title: __('Set up appointments', 'extendify-local'),
	description: __(
		'Start accepting appointments on your website by configuring the Simply Scheduled Appointments plugin.',
		'extendify-local',
	),
	link: 'admin.php?page=simply-schedule-appointments#/wizard/review',
	buttonLabels: {
		notCompleted: __('Set up', 'extendify-local'),
		completed: __('Revisit', 'extendify-local'),
	},
	type: 'internalLink',
	dependencies: { plugins: ['simply-schedule-appointments'] },
	show: ({ plugins, activePlugins }) => {
		// They need either extendable or launch completed
		if (themeSlug !== 'extendable' && !launchCompleted) return false;
		if (!plugins.length) return true;

		return activePlugins.some((item) => plugins.includes(item));
	},
	backgroundImage:
		'https://images.extendify-cdn.com/assist-tasks/calendar-events.webp',
};
