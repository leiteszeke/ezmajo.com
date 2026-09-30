// Pure Esc decision for the global keydown handler. Wiring (listener
// attach, stopPropagation, store mutations) lives in global-escape.js.
// See click-rule.js's module header for the full unified-selector
// contract this is one piece of.
//
// Priority order matches the user-facing contract:
//   1. agent block + QE on the SAME block → clear both in one keypress
//      (two-pill click stages both; collapsing the unwind keeps Esc as
//      a single dismissal gesture rather than the user pressing twice)
//   2. agent block staged    → clear it (also cancels the in-flight workflow)
//   3. QE selection set      → clear it
//   4. committedSelection    → clear it (sticky pre-pill-action commit)
//   5. otherwise             → noop (Esc must not flip edit mode off)
//
// Edit mode off is a pass-through: the per-surface Esc handlers
// (BlockTextEditor capture-phase, WP <Modal>, image-menu) keep working
// because the global handler only consumes Esc while edit mode is on.

export const decideEscapeAction = ({
	editModeOn,
	hasAgentBlock,
	hasQuickEditSelection,
	hasCommittedSelection,
	sameBlock = false,
}) => {
	if (!editModeOn) return { action: 'pass-through' };
	if (hasAgentBlock && hasQuickEditSelection && sameBlock) {
		return { action: 'clear-selection-and-agent-block' };
	}
	if (hasAgentBlock) return { action: 'clear-agent-block' };
	if (hasQuickEditSelection) return { action: 'clear-selection' };
	if (hasCommittedSelection) return { action: 'clear-committed-selection' };
	return { action: 'noop' };
};
