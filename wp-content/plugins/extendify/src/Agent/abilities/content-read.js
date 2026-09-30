import apiFetch from '@wordpress/api-fetch';
import { __ } from '@wordpress/i18n';

const path = '/extendify/v1/agent/content-read';

export const contentRead = {
	name: 'extendify/content-read',
	label: __('Page text', 'extendify-local'),
	description:
		'Read one post, page, header, footer or pattern in full — either the words a visitor sees or the block markup behind them. Name it by the id another tool returned, or by its slug.',
	inputSchema: {
		type: 'object',
		properties: {
			id: {
				type: 'integer',
				description: 'The id of the post to read.',
			},
			slug: {
				type: 'string',
				description: 'The slug of the post to read, when its id is not known.',
			},
			format: {
				type: 'string',
				enum: ['text', 'blocks', 'excerpt'],
				description:
					'text for the words a visitor sees, blocks for the markup behind them, excerpt for the summary. Defaults to text.',
			},
			includeMeta: {
				type: 'boolean',
				description: 'Also return the fields stored alongside the post.',
			},
		},
	},
	annotations: { readonly: true },
	execute: (input = {}) => apiFetch({ path, method: 'POST', data: input }),
};
