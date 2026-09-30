import { waitUntilExists } from '@agent/lib/tour-helpers';
import { __, isRTL } from '@wordpress/i18n';

const { isBlockTheme, themeSlug, adminUrl } = window.extSharedData;

export default {
	id: 'style-editor-tour',
	title: __('Style editor', 'extendify-local'),
	message: __('Tour the style editor', 'extendify-local'),
	settings: {
		allowOverflow: false,
		startFrom: [
			adminUrl +
				// TODO: This needs attention as it was sending me into an infinite frontend loop
				`site-editor.php?canvas=edit&postType=wp_template&postId=${themeSlug}%2F%2Fhome`,
		],
		enabled: isBlockTheme ?? false,
	},
	onStart: () => {
		// close modal if shown
		document.querySelector('.components-modal__header > button')?.click();
	},
	steps: [
		{
			title: __('Style Editor', 'extendify-local'),
			text: __(
				'The style editor allows you to edit the styles, colors, and typographic elements of your site. To access the style editor, first open the Editor via Appearance > Editor.',
				'extendify-local',
			),
			image: 'https://placehold.co/342x240',
			attachTo: {
				element: '.interface-pinned-items button:nth-child(2)',
				offset: {
					marginTop: 10,
					marginLeft: -30,
				},
				position: {
					x: isRTL() ? 'right' : 'left',
					y: 'bottom',
				},
				hook: isRTL() ? 'top right' : 'top left',
			},
			events: {
				beforeAttach: () => waitUntilExists('.interface-pinned-items'),
			},
		},
		{
			title: __('Styles Panel', 'extendify-local'),
			text: __(
				'The styles panel allows you to customize the appearance of your site. It includes style variations, colors, typography, and more.',
				'extendify-local',
			),
			attachTo: {
				element: '.edit-site-global-styles-sidebar',
				offset: {
					marginTop: 1,
					marginLeft: -15,
				},
				position: {
					x: isRTL() ? 'right' : 'left',
					y: 'top',
				},
				hook: isRTL() ? 'top left' : 'top right',
			},
			events: {
				beforeAttach: async () => {
					document
						.querySelector(
							'.interface-pinned-items button:nth-child(2):not(.is-pressed)',
						)
						?.click();
					return await waitUntilExists('.edit-site-global-styles-sidebar');
				},
			},
		},
		{
			title: __('Style Variations', 'extendify-local'),
			text: __(
				'The Browse Styles button opens the style variations panel.',
				'extendify-local',
			),
			attachTo: {
				element: '.edit-site-global-styles-sidebar button[id="/variations"]',
				offset: {
					marginTop: 0,
					marginLeft: -15,
				},
				position: {
					x: isRTL() ? 'right' : 'left',
					y: 'top',
				},
				hook: isRTL() ? 'top left' : 'top right',
			},
			events: {
				beforeAttach: async () => {
					// Press the back button if the next step opened the variations panel, and now we're going back.
					document
						.querySelector(
							'.edit-site-global-styles-sidebar button.components-navigator-back-button',
						)
						?.click();
					return await waitUntilExists(
						'.edit-site-global-styles-preview__iframe',
					);
				},
			},
		},
		{
			title: __('Style Variations', 'extendify-local'),
			text: __(
				'Choose a style you like to preview how it will look on your site.',
				'extendify-local',
			),
			attachTo: {
				element: '.edit-site-global-styles-sidebar__navigator-screen',
				offset: {
					marginTop: 0,
					marginLeft: -15,
				},
				position: {
					x: isRTL() ? 'right' : 'left',
					y: 'top',
				},
				hook: isRTL() ? 'top left' : 'top right',
			},
			events: {
				beforeAttach: async () => {
					document
						.querySelector(
							'.edit-site-global-styles-sidebar button[id="/variations"]',
						)
						?.click();
					return await waitUntilExists(
						'.edit-site-global-styles-header__description',
					);
				},
			},
		},
		{
			title: __('Typography', 'extendify-local'),
			text: __(
				'The Typography button opens the typography settings panel.',
				'extendify-local',
			),
			attachTo: {
				element: '.edit-site-global-styles-sidebar button[id="/typography"]',

				offset: {
					marginTop: 0,
					marginLeft: -15,
				},
				position: {
					x: isRTL() ? 'right' : 'left',
					y: 'top',
				},
				hook: isRTL() ? 'top left' : 'top right',
			},
			events: {
				beforeAttach: async () => {
					// Press the back button if the next step opened the typography panel, and now we're going back.
					document
						.querySelector(
							'.edit-site-global-styles-sidebar button.components-navigator-back-button',
						)
						?.click();
					return await waitUntilExists(
						'.edit-site-global-styles-preview__iframe',
					);
				},
			},
		},
		{
			title: __('Typography', 'extendify-local'),
			text: __('Choose a typographic element to customize.', 'extendify-local'),
			attachTo: {
				element: '.edit-site-global-styles-sidebar__navigator-screen',
				offset: {
					marginTop: 0,
					marginLeft: -15,
				},
				position: {
					x: isRTL() ? 'right' : 'left',
					y: 'top',
				},
				hook: isRTL() ? 'top left' : 'top right',
			},
			events: {
				beforeAttach: async () => {
					document
						.querySelector(
							'.edit-site-global-styles-sidebar button[id="/typography"]',
						)
						?.click();
					return await waitUntilExists(
						'.edit-site-global-styles-header__description',
					);
				},
			},
		},
		{
			title: __('Colors', 'extendify-local'),
			text: __(
				'The Colors button opens the color settings panel.',
				'extendify-local',
			),
			attachTo: {
				element: '.edit-site-global-styles-sidebar button[id="/colors"]',

				offset: {
					marginTop: 0,
					marginLeft: -15,
				},
				position: {
					x: isRTL() ? 'right' : 'left',
					y: 'top',
				},
				hook: isRTL() ? 'top left' : 'top right',
			},
			events: {
				beforeAttach: async () => {
					// Press the back button if the next step opened the typography panel, and now we're going back.
					document
						.querySelector(
							'.edit-site-global-styles-sidebar button.components-navigator-back-button',
						)
						?.click();
					return await waitUntilExists(
						'.edit-site-global-styles-preview__iframe',
					);
				},
			},
		},
		{
			title: __('Colors', 'extendify-local'),
			text: __(
				"Select the theme's palette or individual elements to customize their colors.",
				'extendify-local',
			),
			attachTo: {
				element: '.edit-site-global-styles-sidebar__navigator-screen',
				offset: {
					marginTop: 0,
					marginLeft: -15,
				},
				position: {
					x: isRTL() ? 'right' : 'left',
					y: 'top',
				},
				hook: isRTL() ? 'top left' : 'top right',
			},
			events: {
				beforeAttach: async () => {
					document
						.querySelector(
							'.edit-site-global-styles-sidebar button[id="/colors"]',
						)
						?.click();
					return await waitUntilExists(
						'.edit-site-global-styles-header__description',
					);
				},
			},
		},
		{
			title: __('Layout', 'extendify-local'),
			text: __(
				'The Layout button opens the layout settings panel.',
				'extendify-local',
			),
			attachTo: {
				element: '.edit-site-global-styles-sidebar button[id="/layout"]',

				offset: {
					marginTop: 0,
					marginLeft: -15,
				},
				position: {
					x: isRTL() ? 'right' : 'left',
					y: 'top',
				},
				hook: isRTL() ? 'top left' : 'top right',
			},
			events: {
				beforeAttach: async () => {
					// Press the back button if the next step opened the typography panel, and now we're going back.
					document
						.querySelector(
							'.edit-site-global-styles-sidebar button.components-navigator-back-button',
						)
						?.click();
					return await waitUntilExists(
						'.edit-site-global-styles-preview__iframe',
					);
				},
			},
		},
		{
			title: __('Layout', 'extendify-local'),
			text: __(
				'From here you can customize the dimensions, padding, and margins used for your site layout.',
				'extendify-local',
			),
			attachTo: {
				element: '.edit-site-global-styles-sidebar__navigator-screen',
				offset: {
					marginTop: 0,
					marginLeft: -15,
				},
				position: {
					x: isRTL() ? 'right' : 'left',
					y: 'top',
				},
				hook: isRTL() ? 'top left' : 'top right',
			},
			events: {
				beforeAttach: async () => {
					document
						.querySelector(
							'.edit-site-global-styles-sidebar button[id="/layout"]',
						)
						?.click();
					return await waitUntilExists('.components-tools-panel');
				},
			},
		},
	],
	onFinish: async () => {
		document
			.querySelector(
				'.edit-site-global-styles-sidebar button.components-navigator-back-button',
			)
			?.click();
		return await waitUntilExists('.edit-site-global-styles-preview__iframe');
	},
};
