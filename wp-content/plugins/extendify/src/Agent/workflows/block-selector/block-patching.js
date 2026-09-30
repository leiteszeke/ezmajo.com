import { BlockPatchingConfirm } from '@agent/workflows/block-selector/components/BlockPatchingConfirm';

// Reached only via lib/local-pick.js — available() false keeps it off find-agent.
export default {
	available: () => false,
	id: 'block-patching',
	requires: ['block'],
	whenFinished: { component: BlockPatchingConfirm },
};
