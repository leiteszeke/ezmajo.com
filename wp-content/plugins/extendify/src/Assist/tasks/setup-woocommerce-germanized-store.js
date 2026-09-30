import { __ } from '@wordpress/i18n';

const { themeSlug } = window.extSharedData;
const { launchCompleted } = window.extAssistData;

export default {
	slug: 'setup-woocommerce-germanized-store',
	title: __('Set up WooCommerce Germanized plugin', 'extendify-local'),
	description: __(
		'Ensure your eCommerce store complies with local regulations.',
		'extendify-local',
	),
	link: 'admin.php?page=wc-gzd-setup',
	buttonLabels: {
		notCompleted: __('Set up', 'extendify-local'),
		completed: __('Revisit', 'extendify-local'),
	},
	type: 'internalLink',
	dependencies: {
		plugins: ['woocommerce-germanized'],
	},
	show: ({ plugins, activePlugins }) => {
		// They need either extendable or launch completed
		if (themeSlug !== 'extendable' && !launchCompleted) return false;
		if (!plugins.length) return true;

		return activePlugins.some((item) => plugins.includes(item));
	},
	backgroundImage:
		'https://images.extendify-cdn.com/assist-tasks/woocommerce-2.webp',
};
