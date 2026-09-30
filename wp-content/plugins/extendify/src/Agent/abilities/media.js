import { query } from '@agent/abilities/rest';
import apiFetch from '@wordpress/api-fetch';
import { decodeEntities } from '@wordpress/html-entities';
import { __ } from '@wordpress/i18n';

const fields = 'id,title,alt_text,mime_type,source_url,date,media_details';

export const media = {
	name: 'extendify/media',
	label: __('Media library', 'extendify-local'),
	description:
		'The images, video and files this site has uploaded. Returns each one’s id, name, description, kind, address and size — search by name, narrow to one kind of file, or ask for what a single post has attached.',
	inputSchema: {
		type: 'object',
		properties: {
			search: {
				type: 'string',
				description: 'Words to match against names and descriptions.',
			},
			mimeType: {
				type: 'string',
				description:
					'One kind of file, such as image/jpeg, or a whole family, such as image.',
			},
			postId: {
				type: 'integer',
				description: 'Only what is attached to this post.',
			},
			limit: {
				type: 'integer',
				minimum: 1,
				maximum: 100,
				description: 'How many to return. Defaults to 10.',
			},
		},
	},
	annotations: { readonly: true },
	execute: async ({ search, mimeType, postId, limit = 10 } = {}) => {
		const response = await apiFetch({
			path: `/wp/v2/media?${query({
				search,
				mime_type: mimeType,
				parent: postId,
				per_page: limit,
				_fields: fields,
			})}`,
			parse: false,
		});
		const files = await response.json();

		return {
			total: Number(response.headers.get('X-WP-Total')),
			media: files.map((file) => ({
				id: file.id,
				title: decodeEntities(file.title?.rendered ?? ''),
				alt: file.alt_text ?? '',
				mimeType: file.mime_type,
				url: file.source_url,
				date: file.date,
				...(file.media_details?.width && {
					width: file.media_details.width,
					height: file.media_details.height,
				}),
			})),
		};
	},
};
