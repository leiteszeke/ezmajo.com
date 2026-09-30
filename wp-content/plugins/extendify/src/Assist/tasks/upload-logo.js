import { __ } from '@wordpress/i18n';

const { themeSlug } = window.extSharedData;
const { launchCompleted } = window.extAssistData;

export default {
	slug: 'logo',
	title: __('Upload a logo', 'extendify-local'),
	description: __(
		'Ensure your website is on-brand by adding your logo.',
		'extendify-local',
	),
	buttonLabels: {
		completed: __('Replace', 'extendify-local'),
		notCompleted: __('Upload', 'extendify-local'),
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
