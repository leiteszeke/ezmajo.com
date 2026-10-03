import apiFetch from '@wordpress/api-fetch';
import { decodeEntities } from '@wordpress/html-entities';

// Root-relative, like the menu links a launched site starts with.
const pathOf = (link) => {
	const { pathname, search } = new URL(link);
	return pathname + search;
};

export const fetchLinkablePages = () =>
	apiFetch({
		path: '/wp/v2/pages?status=publish&per_page=100&_fields=id,title,link',
	})
		.then((pages) =>
			pages.map(({ id, title, link }) => ({
				id,
				title: decodeEntities(title?.rendered ?? ''),
				url: pathOf(link),
				link,
			})),
		)
		.catch(() => []);
