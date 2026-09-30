import { UpdateMenuConfirm } from '@agent/workflows/theme/components/UpdateMenuConfirm';

const { abilities, context } = window.extAgentData;

const hasNavMenu = () =>
	window.document.querySelectorAll('nav[data-extendify-menu-id]').length > 0;

export default {
	available: () =>
		abilities?.canEditPost &&
		context?.usingBlockEditor &&
		!context?.adminPage &&
		['post', 'page'].includes(context.postType) &&
		hasNavMenu() &&
		context?.postId,
	id: 'add-post-to-menu',
	whenFinished: { component: UpdateMenuConfirm },
};
