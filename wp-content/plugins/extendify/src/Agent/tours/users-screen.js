import { __, isRTL } from '@wordpress/i18n';

export default {
	id: 'users-screen-tour',
	title: __('Users screen', 'extendify-local'),
	message: __('Tour the Users screen', 'extendify-local'),
	settings: {
		allowOverflow: true,
		startFrom: [`${window.extSharedData.adminUrl}users.php`],
	},
	onStart: () => {
		if (document.body.classList.contains('folded')) {
			document.querySelector('#menu-users').classList.add('opensub');
		}
	},
	steps: [
		{
			title: __('All Users menu', 'extendify-local'),
			text: __(
				'Click here to view and manage the users on your site.',
				'extendify-local',
			),
			attachTo: {
				element: '#menu-users ul > li:nth-child(2)',
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
						document.querySelector('#menu-users').classList.remove('opensub');
					}
				},
			},
		},
		{
			title: __('Users', 'extendify-local'),
			text: __(
				'See all of your users, including admin users in this table.',
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
			title: __('Edit user information', 'extendify-local'),
			text: __(
				"Click the edit button to change the user's role, manage their account, or change their profile information.",
				'extendify-local',
			),
			attachTo: {
				element: 'tbody#the-list > tr:nth-child(1) > td.username',
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
				onAttach: () => {
					document.querySelector(
						'tbody#the-list > tr:nth-child(1) > td.username .row-actions',
					).style.left = '0';
				},
				onDetach: () => {
					document.querySelector(
						'tbody#the-list > tr:nth-child(1) > td.username .row-actions',
					).style.left = '-9999em';
				},
			},
		},
		{
			title: __('Search for users', 'extendify-local'),
			text: __(
				'Use the search bar to find a particular user.',
				'extendify-local',
			),
			attachTo: {
				element: 'p.search-box',
				offset: {
					marginTop: -5,
					marginLeft: isRTL() ? 15 : -15,
				},
				boxPadding: {
					top: 5,
					bottom: 5,
					left: 5,
					right: 5,
				},
				position: {
					x: isRTL() ? 'right' : 'left',
					y: 'top',
				},
				hook: isRTL() ? 'top left' : 'top right',
			},
			events: {},
		},
		{
			title: __('Add a new user', 'extendify-local'),
			text: __(
				'Click the Add New button to add a new user to your site.',
				'extendify-local',
			),
			attachTo: {
				element: '.page-title-action',
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
