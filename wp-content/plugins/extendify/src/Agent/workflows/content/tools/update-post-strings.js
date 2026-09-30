import apiFetch from '@wordpress/api-fetch';

// TODO: check for post_lock and error that someone is editing
export default async ({ postId, postType, replacements }) => {
	const type = postType === 'page' ? 'pages' : 'posts';
	const response = await apiFetch({
		path: `/wp/v2/${type}/${postId}?context=edit`,
	});
	let content = response.content.raw;
	let title = response.title.raw;
	const escapeRegExp = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	for (const { original, updated } of replacements) {
		const regex = new RegExp(escapeRegExp(original), 'g');
		content = content.replace(regex, updated);
		title = title.split(original).join(updated);
	}

	const postResult = await apiFetch({
		path: `/wp/v2/${type}/${postId}`,
		method: 'POST',
		data: { content, title },
	});

	return postResult;
};
