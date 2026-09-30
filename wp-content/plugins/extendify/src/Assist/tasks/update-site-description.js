import { __ } from '@wordpress/i18n';

const { themeSlug } = window.extSharedData;
const { launchCompleted } = window.extAssistData;

export default {
	slug: 'site-description',
	title: __('Add a site description', 'extendify-local'),
	description: __(
		'In a few words, explain what your site is about.',
		'extendify-local',
	),
	buttonLabels: {
		completed: __('Change', 'extendify-local'),
		notCompleted: __('Add', 'extendify-local'),
	},
	type: 'modal',
	dependencies: { plugins: [] },
	show: () => {
		if (themeSlug === 'extendable') return true;
		if (launchCompleted) return true;
		return false;
	},
	backgroundImage:
		'https://images.extendify-cdn.com/assist-tasks/upload-logo.webp',
};
