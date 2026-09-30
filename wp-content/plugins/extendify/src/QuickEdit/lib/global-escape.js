import { useEditModeStore } from '../state/edit-mode';
import { useQuickEditStore } from '../state/store';
import { decideEscapeAction } from './escape-rule';

const CANCEL_EVENT = 'extendify-agent:cancel-workflow';

const onKey = (e) => {
	if (e.key !== 'Escape') return;
	const editModeOn = useEditModeStore.getState().on;
	if (!editModeOn) return;

	const {
		agentBlock,
		selected,
		committedSelection,
		setAgentBlock,
		clearSelected,
		setCommittedSelection,
	} = useQuickEditStore.getState();
	const sameBlock =
		selected?.blockId != null &&
		agentBlock?.id != null &&
		String(selected.blockId) === String(agentBlock.id);
	const { action } = decideEscapeAction({
		editModeOn: true,
		hasAgentBlock: !!agentBlock,
		hasQuickEditSelection: !!selected,
		hasCommittedSelection: !!committedSelection,
		sameBlock,
	});

	if (action === 'clear-selection-and-agent-block') {
		window.dispatchEvent(new CustomEvent(CANCEL_EVENT));
		setAgentBlock(null);
		clearSelected();
		e.preventDefault();
		e.stopPropagation();
		return;
	}
	if (action === 'clear-agent-block') {
		window.dispatchEvent(new CustomEvent(CANCEL_EVENT));
		setAgentBlock(null);
		e.preventDefault();
		e.stopPropagation();
		return;
	}
	if (action === 'clear-selection') {
		clearSelected();
		e.preventDefault();
		e.stopPropagation();
		return;
	}
	if (action === 'clear-committed-selection') {
		setCommittedSelection(null);
		e.preventDefault();
		e.stopPropagation();
		return;
	}
	// noop: stop propagation so the old window-level fallback (which
	// would have toggled edit mode off) stays quiet. preventDefault is
	// intentionally not called — there's nothing to suppress.
	e.stopPropagation();
};

export const wireGlobalEscape = () => {
	document.addEventListener('keydown', onKey);
	return () => document.removeEventListener('keydown', onKey);
};
