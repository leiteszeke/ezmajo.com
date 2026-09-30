import { __ } from '@wordpress/i18n';

const { frontPage, themeSlug } = window.extSharedData;
const { launchCompleted } = window.extAssistData;

export default {
	slug: 'edit-homepage',
	title: __('Edit your homepage', 'extendify-local'),
	description: __(
		'Edit homepage by replacing existing content.',
		'extendify-local',
	),
	buttonLabels: {
		completed: __('Edit now', 'extendify-local'),
		notCompleted: __('Edit now', 'extendify-local'),
	},
	link: 'post.php?post=$&action=edit',
	type: 'internalLink',
	dependencies: { plugins: [] },
	show: () => {
		// They need either extendable or launch completed
		if (themeSlug !== 'extendable' && !launchCompleted) return false;
		return !!frontPage;
	},
	backgroundImage:
		'https://images.extendify-cdn.com/assist-tasks/edit-homepage.webp',
};
