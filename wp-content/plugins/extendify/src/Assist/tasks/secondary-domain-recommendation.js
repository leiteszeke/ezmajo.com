import { __ } from '@wordpress/i18n';

const { themeSlug } = window.extSharedData;
const { launchCompleted } = window.extAssistData;

export default {
	slug: 'secondary-domain-recommendation',
	title: __('Add an additional domain', 'extendify-local'),
	innerTitle: __('Add an additional domain', 'extendify-local'),
	description: __('Get another domain for your site.', 'extendify-local'),
	buttonLabels: {
		completed: __('Register this domain', 'extendify-local'),
		notCompleted: __('Register this domain', 'extendify-local'),
	},
	type: 'secondary-domain-task',
	dependencies: { plugins: [] },
	show: ({ showSecondaryDomainTask }) => {
		// They need either extendable or launch completed
		if (themeSlug !== 'extendable' && !launchCompleted) return false;
		return showSecondaryDomainTask;
	},
	backgroundImage:
		'https://images.extendify-cdn.com/assist-tasks/domains-recommendations.webp',
};
