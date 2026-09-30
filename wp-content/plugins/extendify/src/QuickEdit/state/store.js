import { useEditModeStore } from '@quick-edit/state/edit-mode';
import { create } from 'zustand';

export const useQuickEditStore = create((set, get) => ({
	hovered: null,
	// Quick Edit canvas-mount target — set when the user clicks the Quick
	// Edit pill. See click-rule.js's module header for the full unified
	// selector contract; this and `agentBlock` are the two selection
	// slots Quick Edit and the AI Agent share.
	selected: null,
	dirty: {},
	saving: false,
	error: null,
	// Ask AI staged block — see buildAgentBlockDescriptor for the shape.
	// Distinct from `selected` by design: a QE canvas opens a modal flow
	// for one block, while an Ask AI selection stages a block for a
	// multi-turn workflow.
	agentBlock: null,
	agentBlockCode: null,
	// Sticky pre-pill-action selection — set when the user clicks a tagged
	// block on the live front end. While set, hover on other tagged blocks
	// is suppressed and the bar/outline stay pinned. Cleared by an outside
	// click, a click on a different tagged block, or a pill action (which
	// hands off to `selected` / `agentBlock`). Shape mirrors buildTarget:
	// { el, blockType, blockId, source }.
	committedSelection: null,

	setHovered: (target) => set({ hovered: target }),
	setSelected: (target) => set({ selected: target, dirty: {}, error: null }),
	clearSelected: () => set({ selected: null, dirty: {}, error: null }),

	setAgentBlock: (agentBlock) => {
		// A staged block is invisible without the selection UI.
		if (agentBlock) useEditModeStore.getState().setOn(true);
		set({ agentBlock, agentBlockCode: null });
	},
	setAgentBlockCode: (agentBlockCode) => set({ agentBlockCode }),

	setCommittedSelection: (committedSelection) => set({ committedSelection }),

	setField: (fieldKey, value) =>
		set((state) => ({
			dirty: { ...state.dirty, [fieldKey]: value },
		})),

	setSaving: (saving) => set({ saving }),
	setError: (error) => set({ error }),

	getPatches: () => {
		const dirty = get().dirty;
		return Object.entries(dirty).map(([fieldKey, value]) => ({
			fieldKey,
			value,
		}));
	},
}));
