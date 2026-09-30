import apiFetch from '@wordpress/api-fetch';

export default async ({ updatedPageBlocks, postId }) => {
	if (!updatedPageBlocks) return;

	await apiFetch({
		path: `/wp/v2/pages/${postId}`,
		method: 'POST',
		data: { content: updatedPageBlocks },
	});
};
