import { waitUntilExists } from '@help-center/lib/tour-helpers';
import { hasPageCreatorEnabled } from '@help-center/lib/utils';
import { __, isRTL } from '@wordpress/i18n';

export default {
	id: 'page-creator-tour',
	title: __('AI Page Generator', 'extendify-local'),
	settings: {
		allowOverflow: true,
		hideDotsNav: true,
		startFrom: [
			hasPageCreatorEnabled
				? `${window.extSharedData.adminUrl}post-new.php?post_type=page&ext-page-creator-close=1`
				: `${window.extSharedData.adminUrl}post-new.php?post_type=page&ext-close=1`,
			`${window.extSharedData.adminUrl}post-new.php?post_type=page`,
		],
	},
	onStart: async () => {
		// Wait for gutenberg to be ready
		await waitUntilExists('#extendify-page-creator-btn [role="button"]');

		// Close sidebar if open
		document
			.querySelector(`[aria-label="${__('Settings')}"].is-pressed`)
			?.click();
	},
	steps: [
		{
			title: __('AI Page Generator', 'extendify-local'),
			text: __(
				'Press here to get started with your AI Page Generator.',
				'extendify-local',
			),
			attachTo: {
				element: '#extendify-page-creator-btn [role="button"]',
				offset: {
					marginTop: 0,
					marginLeft: isRTL() ? -15 : 15,
				},
				position: {
					x: isRTL() ? 'left' : 'right',
					y: 'top',
				},
				hook: isRTL() ? 'top right' : 'top left',
			},
			events: {
				beforeAttach: async () => {
					await waitUntilExists('#extendify-page-creator-btn [role="button"]');
				},
			},
		},
		{
			title: __('Page description', 'extendify-local'),
			text: __(
				'Write a description of the page you want to create. Be as detailed as you like. We will create a page based on this description.',
				'extendify-local',
			),
			attachTo: {
				element: '#extendify-page-creator-page-description',
				position: {
					x: isRTL() ? 'left' : 'right',
					y: 'top',
				},
				hook: isRTL() ? 'top right' : 'top left',
			},
			options: {
				allowPointerEvents: true,
			},
			events: {
				beforeAttach: async () => {
					// Open the Extendify library panel
					dispatchEvent(new CustomEvent('extendify::open-page-creator'));

					return await waitUntilExists(
						'#extendify-page-creator-page-description',
					);
				},
			},
		},
		{
			title: __('Site description', 'extendify-local'),
			text: __(
				'If needed, update your site description here. We use this to add additional context about your website.',
				'extendify-local',
			),
			attachTo: {
				element: '#extendify-page-creator-site-description',
				offset: {
					marginTop: -15,
					marginLeft: 0,
				},
				position: {
					x: isRTL() ? 'left' : 'right',
					y: 'top',
				},
				hook: isRTL() ? 'bottom left' : 'bottom right',
			},
			events: {
				beforeAttach: async () => {
					await waitUntilExists('#extendify-page-creator-site-description');
				},
			},
		},
		{
			title: __('Generate your page', 'extendify-local'),
			text: __(
				'When ready, press here to generate your page.',
				'extendify-local',
			),
			attachTo: {
				element: '#extendify-page-creator-generate-btn',
				offset: {
					marginTop: -15,
					marginLeft: 0,
				},
				position: {
					x: isRTL() ? 'left' : 'right',
					y: 'top',
				},
				hook: isRTL() ? 'bottom left' : 'bottom right',
			},
			events: {
				beforeAttach: () => {},
			},
			options: {
				hideBackButton: true,
			},
		},
	],
};
