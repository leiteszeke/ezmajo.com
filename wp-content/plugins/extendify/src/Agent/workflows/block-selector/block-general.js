import { UpdateBlockConfirm } from '@agent/workflows/block-selector/components/UpdateBlockConfirm';

const { context, abilities } = window.extAgentData;

export default {
	available: () =>
		abilities?.canEditPosts &&
		!context?.adminPage &&
		context?.postId &&
		!context?.isBlogPage &&
		context?.isBlockTheme &&
		document.querySelector('.wp-site-blocks'),
	id: 'block-general',
	requires: ['block'],
	whenFinished: { component: UpdateBlockConfirm },
};
