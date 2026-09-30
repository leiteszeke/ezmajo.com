import { __ } from '@wordpress/i18n';

const { themeSlug } = window.extSharedData;
const { launchCompleted } = window.extAssistData;

export default {
	slug: 'domain-recommendation',
	title: __('Choose your domain', 'extendify-local'),
	innerTitle: __('Claim your domain', 'extendify-local'),
	description: __('Claim the perfect domain for your site.', 'extendify-local'),
	buttonLabels: {
		completed: __('Register this domain', 'extendify-local'),
		notCompleted: __('Register this domain', 'extendify-local'),
	},
	type: 'domain-task',
	dependencies: { plugins: [] },
	show: ({ showDomainTask }) => {
		// They need either extendable or launch completed
		if (themeSlug !== 'extendable' && !launchCompleted) return false;
		return showDomainTask;
	},
	backgroundImage:
		'https://images.extendify-cdn.com/assist-tasks/domains-recommendations.webp',
};
