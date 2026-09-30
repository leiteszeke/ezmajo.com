import apiFetch from '@wordpress/api-fetch';
import { addQueryArgs } from '@wordpress/url';

// Shared so the tool and DOMHighlighter build the same query args and can't drift.
export const blockCodeQueryArgs = (block, postId) => {
	if (!block?.id) return null;
	if (block.source?.kind === 'template-part') {
		const { partSlug } = block.source;
		return partSlug ? { blockId: String(block.id), partSlug } : null;
	}
	return postId ? { blockId: String(block.id), postId: String(postId) } : null;
};

// One block's current serialized code by TagBlocks id, scoped to the container's source.
export const fetchBlockCodeById = async (blockId, source, postId) => {
	const args = blockCodeQueryArgs({ id: blockId, source }, postId);
	if (!args) return '';
	const response = await apiFetch({
		path: addQueryArgs('/extendify/v1/agent/get-block-code', args),
	});
	return response?.block ?? '';
};
