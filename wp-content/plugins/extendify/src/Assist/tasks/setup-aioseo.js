import { __ } from '@wordpress/i18n';

const { themeSlug } = window.extSharedData;
const { launchCompleted } = window.extAssistData;

export default {
	slug: 'setup-aioses',
	title: __('Set up All in One SEO', 'extendify-local'),
	description: __(
		'Set up the All in One SEO plugin to enhance your website discoverability.',
		'extendify-local',
	),
	link: '?page=aioseo-setup-wizard#/welcome',
	buttonLabels: {
		notCompleted: __('Set up', 'extendify-local'),
		completed: __('Revisit', 'extendify-local'),
	},
	type: 'internalLink',
	dependencies: { plugins: ['all-in-one-seo-pack'] },
	show: ({ plugins, activePlugins }) => {
		// They need either extendable or launch completed
		if (themeSlug !== 'extendable' && !launchCompleted) return false;
		if (!plugins.length) return true;

		return activePlugins.some((item) => plugins.includes(item));
	},
	backgroundImage:
		'https://images.extendify-cdn.com/assist-tasks/bg-for-seo.webp',
};
