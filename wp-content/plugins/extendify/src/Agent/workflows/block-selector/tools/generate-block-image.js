import apiFetch from '@wordpress/api-fetch';

// TODO: check for post_lock and error that someone is editing
export default async ({ previousContent, newContent }) => {
	const { postType, postId } = window.extAgentData.context;

	const type = await apiFetch({
		path: `/wp/v2/types/${encodeURIComponent(postType)}`,
	});
	const base = type?.rest_base || `${postType}s`;

	const response = await apiFetch({
		path: `/wp/v2/${base}/${postId}?context=edit`,
	});

	const content = response.content.raw.replace(previousContent, newContent);

	await apiFetch({
		path: `/wp/v2/${base}/${postId}`,
		method: 'POST',
		data: { content },
	});
};
