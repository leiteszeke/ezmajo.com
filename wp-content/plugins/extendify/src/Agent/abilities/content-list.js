import { query, restBase } from '@agent/abilities/rest';
import apiFetch from '@wordpress/api-fetch';
import { decodeEntities } from '@wordpress/html-entities';
import { __ } from '@wordpress/i18n';

const fields = 'id,title,slug,status,date,link';

export const contentList = {
	name: 'extendify/content-list',
	label: __('Site content', 'extendify-local'),
	description:
		'List this site’s posts, pages or any other post type, or count how many match. Returns each one’s id, title, slug, status, date and address, not its content.',
	inputSchema: {
		type: 'object',
		properties: {
			postType: {
				type: 'string',
				description: 'The post type to list. Defaults to post.',
			},
			status: {
				type: 'string',
				description:
					'Defaults to publish. Use any to cover every status, including drafts and trash.',
			},
			search: {
				type: 'string',
				description: 'Words to match against titles and content.',
			},
			author: {
				type: 'integer',
				description: 'The id of an author.',
			},
			after: {
				type: 'string',
				description: 'Only what was published after this ISO 8601 date.',
			},
			before: {
				type: 'string',
				description: 'Only what was published before this ISO 8601 date.',
			},
			orderBy: {
				type: 'string',
				enum: ['date', 'modified', 'title', 'id', 'author'],
			},
			order: { type: 'string', enum: ['asc', 'desc'] },
			limit: {
				type: 'integer',
				minimum: 1,
				maximum: 100,
				description: 'How many to return. Defaults to 10.',
			},
			count: {
				type: 'boolean',
				description: 'Return how many match rather than the list itself.',
			},
		},
	},
	annotations: { readonly: true },
	execute: async ({
		postType = 'post',
		status = 'publish',
		search,
		author,
		after,
		before,
		orderBy,
		order,
		limit = 10,
		count,
	} = {}) => {
		const base = await restBase(`/wp/v2/types/${postType}`);
		if (!base) return { error: `No post type named ${postType} can be read.` };

		const response = await apiFetch({
			path: `/wp/v2/${base}?${query({
				status,
				search,
				author,
				after,
				before,
				orderby: orderBy,
				order,
				per_page: count ? 1 : limit,
				_fields: count ? 'id' : fields,
			})}`,
			parse: false,
		});
		const total = Number(response.headers.get('X-WP-Total'));
		if (count) return { count: total };

		const posts = await response.json();
		return {
			total,
			posts: posts.map(({ id, title, slug, status, date, link }) => ({
				id,
				title: decodeEntities(title?.rendered ?? ''),
				slug,
				status,
				date,
				link,
			})),
		};
	},
};
