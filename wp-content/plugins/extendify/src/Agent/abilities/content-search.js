import apiFetch from '@wordpress/api-fetch';
import { __ } from '@wordpress/i18n';

const path = '/extendify/v1/agent/content-search';

export const contentSearch = {
	name: 'extendify/content-search',
	label: __('Site text', 'extendify-local'),
	description:
		'Find which of this site’s posts, pages, headers, footers and patterns say something, and read the words around each match. It searches the text a visitor sees, so wording that only appears once a pattern or shortcode has run is found too. Look for a single word or a short phrase, not a sentence.',
	inputSchema: {
		type: 'object',
		properties: {
			query: {
				type: 'string',
				description: 'The word or short phrase to look for.',
			},
			postTypes: {
				type: 'array',
				items: { type: 'string' },
				description:
					'Which post types to look through. Defaults to posts, pages, template parts and patterns.',
			},
			limit: {
				type: 'integer',
				minimum: 1,
				maximum: 25,
				description: 'How many posts to return. Defaults to 10.',
			},
			context: {
				type: 'integer',
				minimum: 10,
				maximum: 300,
				description:
					'How many characters to quote either side of a match. Defaults to 60.',
			},
		},
		required: ['query'],
	},
	annotations: { readonly: true },
	execute: (input = {}) => apiFetch({ path, method: 'POST', data: input }),
};
