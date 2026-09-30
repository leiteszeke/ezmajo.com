import { __ } from '@wordpress/i18n';

const { themeSlug } = window.extSharedData;
const { launchCompleted } = window.extAssistData;

export default {
	slug: 'setup-monsterinsights',
	title: __('Set up analytics', 'extendify-local'),
	description: __(
		'Set up the MonsterInsights plugin to enable Google Analytics in your website.',
		'extendify-local',
	),
	link: '?page=monsterinsights-onboarding#/',
	buttonLabels: {
		notCompleted: __('Set up', 'extendify-local'),
		completed: __('Revisit', 'extendify-local'),
	},
	type: 'internalLink',
	dependencies: { plugins: ['google-analytics-for-wordpress'] },
	show: ({ plugins, activePlugins }) => {
		// They need either extendable or launch completed
		if (themeSlug !== 'extendable' && !launchCompleted) return false;
		if (!plugins.length) return true;

		return activePlugins.some((item) => plugins.includes(item));
	},
	backgroundImage: 'https://images.extendify-cdn.com/assist-tasks/hubspot.webp',
};
