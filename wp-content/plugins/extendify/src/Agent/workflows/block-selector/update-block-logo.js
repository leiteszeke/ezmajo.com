import { UpdateLogoConfirm } from '@agent/workflows/theme/components/UpdateLogoConfirm';

const { context, abilities } = window.extAgentData;

export default {
	available: () =>
		abilities?.canUploadMedia &&
		!context?.adminPage &&
		context?.postId &&
		!context?.isBlogPage &&
		context?.isBlockTheme &&
		document.querySelector('.wp-site-blocks'),
	id: 'block-update-logo',
	requires: ['block'],
	whenFinished: { component: UpdateLogoConfirm },
};
