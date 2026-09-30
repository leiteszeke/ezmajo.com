import apiFetch from '@wordpress/api-fetch';

const postTypes = { page: 'pages', post: 'posts' };

// status should only be either "publish" or "draft"
export default async ({ postId, postType }) => {
	const type = postTypes[postType] || postType;
	const response = await apiFetch({
		path: `/wp/v2/${type}/${postId}?context=view`,
	});

	return { post_status: response.status };
};
