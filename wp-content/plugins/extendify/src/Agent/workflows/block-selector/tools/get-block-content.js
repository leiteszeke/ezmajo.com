import { useQuickEditStore } from '@quick-edit/state/store';
import apiFetch from '@wordpress/api-fetch';

export default async () => {
	const block = useQuickEditStore.getState().agentBlock;
	if (!block?.id) return { previousContent: '' };
	const { postId } = window.extAgentData.context;
	const response = await apiFetch({
		path: `/extendify/v1/agent/get-block-code?postId=${postId}&blockId=${block.id}`,
	});
	return { previousContent: response?.block ?? '' };
};
