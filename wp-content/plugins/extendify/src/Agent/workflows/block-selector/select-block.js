import { BlockPatchingConfirm } from '@agent/workflows/block-selector/components/BlockPatchingConfirm';

const BLOCK_ID_ATTR = 'data-extendify-agent-block-id';

export default {
	// Block ids exist only on the front end — TagBlocks bails in wp-admin.
	available: () => !!document.querySelector(`[${BLOCK_ID_ATTR}]`),
	id: 'select-block',
	whenFinished: { component: BlockPatchingConfirm },
	// No `requires: ['block']` — this workflow is what produces the selection.
};
