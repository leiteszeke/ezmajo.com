import { __, isRTL } from '@wordpress/i18n';

export default {
	id: 'plugin-management-tour',
	title: __('Plugin management', 'extendify-local'),
	settings: {
		allowOverflow: false,
		startFrom: [`${window.extSharedData.adminUrl}plugins.php`],
	},
	onStart: () => {
		if (document.body.classList.contains('folded')) {
			document.querySelector('#menu-plugins').classList.add('opensub');
		}
	},
	steps: [
		{
			title: __('Installed Plugins menu', 'extendify-local'),
			text: __(
				'Click this menu to see and manage the plugins you have installed.',
				'extendify-local',
			),
			attachTo: {
				element: '#menu-plugins ul > li:nth-child(2)',
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
			title: __('Installed plugins', 'extendify-local'),
			text: __(
				'See all plugins installed on your site. This includes plugins that are active and deactivated.',
				'extendify-local',
			),
			attachTo: {
				element: 'tbody#the-list > tr:nth-child(1)',
				offset: {
					marginTop: 15,
					marginLeft: 0,
				},
				position: {
					x: isRTL() ? 'left' : 'right',
					y: 'bottom',
				},
				hook: isRTL() ? 'top left' : 'top right',
			},
			events: {},
		},
		{
			title: __('Deactivate/activate option', 'extendify-local'),
			text: __(
				'Under each plugin you can activate or deactivate it.',
				'extendify-local',
			),
			attachTo: {
				element: 'tbody#the-list > tr:nth-child(1) > td.plugin-title',
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
			events: {},
		},
		// {
		//     title: __('Enable auto-updates', 'extendify-local'),
		//     text: __(
		//         "If you'd like, you can set any plugin to auto-update when a new version is available.",
		//         'extendify-local',
		//     ),
		//     attachTo: {
		//         element:
		//             'tbody#the-list > tr:nth-child(1) > td.column-auto-updates',
		//         offset: {
		//             marginTop: 0,
		//             marginLeft: -15,
		//         },
		//         position: {
		//             x: 'left',
		//             y: 'top',
		//         },
		//         hook: 'top right',
		//     },
		//     events: {},
		// },
		{
			title: __('Add another', 'extendify-local'),
			text: __(
				'Click here to add another plugin to your site.',
				'extendify-local',
			),
			attachTo: {
				element: 'a.page-title-action',
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
