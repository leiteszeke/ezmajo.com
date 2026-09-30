import apiFetch from '@wordpress/api-fetch';

const postTypes = { page: 'pages', post: 'posts' };

export default async ({ postId, postType }) => {
	// Get all nav menus that are presented in the post/page.
	const postNavigations = Array.from(
		window.document?.querySelectorAll('nav[data-extendify-menu-id]') ?? [],
	)
		.map((nav) => nav.dataset.extendifyMenuId)
		.filter(Boolean);

	// get the data about those nav menus
	const navigations =
		postNavigations.length > 0
			? await apiFetch({
					method: 'POST',
					path: '/extendify/v1/agent/site-navigation',
					data: { only: postNavigations.join(',') },
				}).catch(() => [])
			: [];

	// we only to update the post url when the post is not a draft.
	if (
		window.extAgentData?.context &&
		window.extAgentData?.context?.postStatus !== 'draft'
	) {
		// When a draft post/page becomes published, we need to update the URL
		// from `?page_id=123` format to the SEO-friendly permalink structure
		// to ensure a proper link in the menu.

		let postUrl = window.wp?.data
			?.select('core')
			?.getEntityRecord('postType', postType, postId)?.link;

		// fallback if the above fails
		if (!postUrl && postTypes[postType]) {
			const postInfo = await apiFetch({
				path: `/wp/v2/${postTypes[postType]}/${postId}`,
			}).catch(console.error);
			postUrl = postInfo?.link;
		}

		if (postUrl && window.extAgentData?.context) {
			window.extAgentData.context.postUrl = postUrl;
		}
	}

	return { navigations };
};
