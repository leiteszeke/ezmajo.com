import { UpdatePostConfirmEditor } from '@agent/workflows/content/components/UpdatePostConfirmEditor';

const { abilities, context } = window.extAgentData;

// When on the edit screen
export default {
	available: () =>
		abilities?.canEditPost &&
		context?.usingBlockEditor &&
		context?.adminPage &&
		context?.postId,
	id: 'edit-post-strings-editor',
	whenFinished: { component: UpdatePostConfirmEditor },
};
