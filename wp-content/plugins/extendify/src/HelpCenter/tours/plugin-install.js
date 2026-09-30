import { __, isRTL } from '@wordpress/i18n';

export default {
	id: 'plugin-install-tour',
	title: __('Installing a plugin', 'extendify-local'),
	settings: {
		allowOverflow: false,
		startFrom: [`${window.extSharedData.adminUrl}plugin-install.php`],
	},
	onStart: () => {
		if (document.body.classList.contains('folded')) {
			document.querySelector('#menu-plugins').classList.add('opensub');
		}
	},
	steps: [
		{
			title: __('Add New plugin menu', 'extendify-local'),
			text: __('Click here to access the Add Plugins page.', 'extendify-local'),
			attachTo: {
				element: '#menu-plugins .wp-submenu a[href="plugin-install.php"]',
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
				onDetach: () => {
					if (document.body.classList.contains('folded')) {
						document.querySelector('#menu-plugins').classList.remove('opensub');
					}
				},
			},
		},
		{
			title: __('Search', 'extendify-local'),
			text: __(
				'Search for a plugin by name or functionality.',
				'extendify-local',
			),
			attachTo: {
				element: '.search-form.search-plugins',
				offset: {
					marginTop: 5,
					marginLeft: isRTL() ? 350 : -350,
				},
				boxPadding: {
					top: -5,
					bottom: 3,
					left: 5,
					right: 5,
				},
				position: {
					x: isRTL() ? 'right' : 'left',
					y: 'top',
				},
				hook: isRTL() ? 'top right' : 'top left',
			},
			events: {},
		},
		{
			title: __('Plugin details', 'extendify-local'),
			text: __(
				'See important information about each plugin.',
				'extendify-local',
			),
			attachTo: {
				element: '#the-list .plugin-card:first-child .plugin-card-bottom',
				offset: {
					marginTop: 0,
					marginLeft: isRTL() ? -15 : 15,
				},
				position: {
					x: isRTL() ? 'left' : 'right',
					y: 'bottom',
				},
				hook: isRTL() ? 'bottom right' : 'bottom left',
			},
			events: {},
		},
		{
			title: __('Install now', 'extendify-local'),
			text: __(
				'Install the plugin. Then, press this button again to activate the plugin.',
				'extendify-local',
			),
			attachTo: {
				element: '#the-list .plugin-card:first-child .install-now',
				offset: {
					marginTop: -5,
					marginLeft: isRTL() ? -15 : 15,
				},
				boxPadding: {
					top: 5,
					bottom: 5,
					left: 5,
					right: 5,
				},
				position: {
					x: isRTL() ? 'left' : 'right',
					y: 'top',
				},
				hook: isRTL() ? 'top right' : 'top left',
			},
			events: {},
		},
		{
			title: __('Upload Plugin', 'extendify-local'),
			text: __(
				'If you have a plugin from an external source, you can upload it directly here.',
				'extendify-local',
			),
			attachTo: {
				element: '.upload-view-toggle',
				offset: {
					marginTop: -5,
					marginLeft: isRTL() ? -15 : 15,
				},
				boxPadding: {
					top: 5,
					bottom: 5,
					left: 5,
					right: 5,
				},
				position: {
					x: isRTL() ? 'left' : 'right',
					y: 'top',
				},
				hook: isRTL() ? 'top right' : 'top left',
			},
			events: {},
		},
	],
};
