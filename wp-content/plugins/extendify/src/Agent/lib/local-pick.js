// Resolve a block edit's workflow on-device so we can skip the network find-agent.

import { IGNORED_BLOCKS } from './classify-block-edit';

export const localPickWorkflow = ({ block }) => {
	if (!block || !block.blockType || IGNORED_BLOCKS.has(block.blockType)) {
		return null;
	}
	return { id: 'block-patching' };
};
