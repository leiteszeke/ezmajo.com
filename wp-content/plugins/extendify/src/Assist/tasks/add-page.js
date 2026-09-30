import { __ } from '@wordpress/i18n';

const { themeSlug } = window.extSharedData;
const { launchCompleted } = window.extAssistData;

export default {
	slug: 'add-pages',
	title: __('Add a page', 'extendify-local'),
	description: __('Add a new page for your website.', 'extendify-local'),
	buttonLabels: {
		completed: __('Add new', 'extendify-local'),
		notCompleted: __('Add new', 'extendify-local'),
	},
	link: 'post-new.php?post_type=page',
	type: 'internalLink',
	dependencies: { plugins: [] },
	show: () => {
		if (themeSlug === 'extendable') return true;
		if (launchCompleted) return true;
		return false;
	},
	backgroundImage:
		'https://images.extendify-cdn.com/assist-tasks/add-page.webp',
};
