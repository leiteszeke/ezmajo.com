import { query, restBase } from '@agent/abilities/rest';
import apiFetch from '@wordpress/api-fetch';
import { decodeEntities } from '@wordpress/html-entities';
import { __ } from '@wordpress/i18n';

const fields = 'id,name,slug,count,parent';

export const taxonomies = {
	name: 'extendify/taxonomies',
	label: __('Categories and tags', 'extendify-local'),
	description:
		'The ways this site groups its content — its categories and tags, and whatever else its theme or plugins added. Ask without naming one for the list of them, name one for the terms in it, or name a post for the terms that post carries.',
	inputSchema: {
		type: 'object',
		properties: {
			taxonomy: {
				type: 'string',
				description:
					'Which one to read terms from, such as category or post_tag. Omit it to list them instead.',
			},
			postId: {
				type: 'integer',
				description: 'Only the terms this post carries.',
			},
			search: {
				type: 'string',
				description: 'Words to match against term names.',
			},
			limit: {
				type: 'integer',
				minimum: 1,
				maximum: 100,
				description: 'How many terms to return. Defaults to 20.',
			},
		},
	},
	annotations: { readonly: true },
	execute: async ({ taxonomy, postId, search, limit = 20 } = {}) => {
		if (!taxonomy) {
			const registered = await apiFetch({ path: '/wp/v2/taxonomies' });
			return {
				taxonomies: Object.values(registered).map(
					({ name, slug, types, hierarchical }) => ({
						name: decodeEntities(name),
						slug,
						postTypes: types,
						hierarchical,
					}),
				),
			};
		}

		const base = await restBase(`/wp/v2/taxonomies/${taxonomy}`);
		if (!base) return { error: `No taxonomy named ${taxonomy} can be read.` };

		const response = await apiFetch({
			path: `/wp/v2/${base}?${query({
				search,
				post: postId,
				per_page: limit,
				_fields: fields,
			})}`,
			parse: false,
		});
		const terms = await response.json();

		return {
			taxonomy,
			total: Number(response.headers.get('X-WP-Total')),
			terms: terms.map(({ id, name, slug, count, parent }) => ({
				id,
				name: decodeEntities(name),
				slug,
				count,
				parent,
			})),
		};
	},
};
