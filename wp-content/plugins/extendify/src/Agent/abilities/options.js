import apiFetch from '@wordpress/api-fetch';
import { __ } from '@wordpress/i18n';

const path = '/extendify/v1/agent/site-options';

export const options = {
	name: 'extendify/options',
	label: __('Site settings', 'extendify-local'),
	description:
		'Read the settings this site stores, which is where WordPress, its theme and its plugins each keep their configuration. The address the site sends mail to is admin_email. Search by part of a name to find where something is kept, or name the settings to read them outright.',
	inputSchema: {
		type: 'object',
		properties: {
			search: {
				type: 'string',
				description:
					'Part of a setting name, such as the prefix a plugin puts on its own.',
			},
			name: {
				type: 'string',
				description: 'A setting to read.',
			},
			names: {
				type: 'array',
				items: { type: 'string' },
				description: 'Several settings to read at once.',
			},
		},
	},
	annotations: { readonly: true },
	execute: (input = {}) => apiFetch({ path, method: 'POST', data: input }),
};
