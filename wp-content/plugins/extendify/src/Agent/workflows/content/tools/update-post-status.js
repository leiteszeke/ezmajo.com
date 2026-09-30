import apiFetch from '@wordpress/api-fetch';

const postTypes = { page: 'pages', post: 'posts' };

// status should only be either "publish" or "draft"
export default async ({ postId, postType, updatedStatus }) => {
	const type = postTypes[postType] || postType;
	return await apiFetch({
		path: `/wp/v2/${type}/${postId}?context=edit`,
		method: 'POST',
		data: { status: updatedStatus },
	});
};
