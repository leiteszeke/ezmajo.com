// === Unified front-end selector — canonical reference ===
//
// Edit mode is opt-out: post-Launch users land on the front end with
// `extendify-quick-edit-on` already on `<html>`. The page must still
// behave like a visitor's page for navigation; selection has to layer on
// top without breaking the click semantics users expect from links and
// form controls. That contract lives in this file and two siblings:
//
//   click-rule.js   (this file)   — what a click does
//   escape-rule.js                — what Esc does
//   ../state/store.js             — unified selection state
//
// Cursor (CSS, in quick-edit.css) telegraphs the click rule before the
// click: crosshair on tagged-block content, pointer on anchors, UA
// default on form controls. The CSS is the user-visible promise the JS
// keeps.
//
// --- Click rule ---
//
// Capture-phase listener on `document` while edit mode is on. Given the
// click target, returns the branch the listener should take. Wiring
// (preventDefault, stopPropagation, hover-bar render/clear, the soft-
// selection carve-out for the staged block) lives in hover-bar.js.
//
// Priority — first matching branch wins:
//   1. anchor          — let the browser navigate (cursor: pointer)
//   2. pill / toolbar  — let the bubble-phase pill handler fire
//   3. form control    — let the input/textarea/select/button focus
//   4. tagged block    — commit selection on the innermost tagged ancestor
//   5. otherwise       — outside-click, clear any open hover bar
//
// A tagged-block click pins the bar and focuses its first pill; it never
// opens Quick Edit and never stages the block for the agent. The pills are
// the only entry to either surface, so the two can't hold one block at once.
//
// Anchor beats tagged-block intentionally: clicking a link in a nav menu
// or a button inside a tagged section navigates. Pills carry
// `data-extendify-quick-edit-pill` so they survive the form-control
// branch (the pill is a <button>). Tagged blocks are detected by any of
// the five data attributes the block-tagging filters emit
// (`data-extendify-agent-block-id`, `-part-block-id`,
// `-quick-edit-product-id`, `-quick-edit-wpform-field-id`,
// `-quick-edit-mediatext-media`).
//
// --- Selection state shape ---
//
// One store (`useQuickEditStore`) carries three slots:
//
//   selected            — Quick Edit canvas-mount target. Set when the
//                         user clicks the Quick Edit pill; drives the
//                         inline editor.
//   agentBlock          — Ask AI staged block. Set by the Ask AI pill or
//                         by an agent workflow; drives DOMHighlighter's
//                         outline + X-close.
//   committedSelection  — Sticky pre-pill-action selection. Set by the
//                         `select` branch below; pins the hover bar +
//                         outline to a clicked block until the user
//                         clicks outside, clicks a different tagged
//                         block, or clicks a pill (which hands off to
//                         `selected` / `agentBlock`).
//
// The three coexist and stay distinct on purpose: a QE canvas opens for
// a modal flow on one block; an Ask AI selection stages a block for a
// multi-turn workflow; a committed selection holds the hover bar steady
// so the user's cursor can travel to a pill without losing the target.
// Same store keeps cross-feature gating cheap (hasAgentBlockSelected,
// committedSelection truthiness) without a bridge.
//
// --- Sticky selection (agentBlock + committedSelection) ---
//
// When either slot is set, hover-driven bar movement is fully
// suppressed — no re-render on any hover, including tagged inner
// children of the held block. The user can't accidentally re-pick a
// neighbour or drift the bar onto a descendant.
//
// `agentBlock` keeps the bar HIDDEN (only DOMHighlighter's X-close
// indicator shows). No pills, ever, while staged — to re-engage Ask
// AI, the user clicks the X-close (clears agentBlock) and re-hovers /
// re-clicks the block. This avoids a broken state where clicking the
// Quick Edit pill while a block is staged for Ask AI opened the
// canvas while leaving the agent's selection outline + X-close on
// top of it.
//
// `committedSelection` keeps the bar PINNED on the committed element.
// The pills stay clickable; no hover moves the bar.
//
// Clicks INSIDE the held block route natively (anchor navigates, form
// control focuses) — EXCEPT when they land on a tagged descendant
// block, in which case the same click swaps the selection onto the
// descendant (drill-in parity with the cross-sibling swap below).
// Clicks OUTSIDE clear the relevant slot; if the same click also lands
// on a different tagged block, the click rule commits it in the same
// gesture so a single click swaps the selection. For `agentBlock` the
// clear is a soft one: the sidebar stays open (closing the sidebar
// still cascades to clearing the block via Agent.jsx, but clearing the
// block here does not close the sidebar).
//
// --- Esc rule ---
//
// One global keydown handler (escape-rule.js + global-escape.js):
//   1. agent block staged → clear it (also cancels in-flight workflow)
//   2. QE selection set   → clear it
//   3. otherwise          → noop (Esc must not flip edit mode off)
//
// Per-surface Esc handlers (BlockTextEditor capture-phase, WP <Modal>,
// image-menu) bubble before the global one and keep working.

const POST_ATTR = 'data-extendify-agent-block-id';
const PART_ATTR = 'data-extendify-part-block-id';
const PRODUCT_ATTR = 'data-extendify-quick-edit-product-id';
const WPFORM_FIELD_ATTR = 'data-extendify-quick-edit-wpform-field-id';
const MEDIATEXT_MEDIA_ATTR = 'data-extendify-quick-edit-mediatext-media';

const PILL_SELECTOR =
	'[data-extendify-quick-edit-pill], [data-extendify-quick-edit-bar]';
const FORM_SELECTOR = 'input, textarea, select, button';
const TAGGED_SELECTOR = [
	`[${POST_ATTR}]`,
	`[${PART_ATTR}]`,
	`[${PRODUCT_ATTR}]`,
	`[${WPFORM_FIELD_ATTR}]`,
	`[${MEDIATEXT_MEDIA_ATTR}]`,
].join(', ');

export const decideClickAction = (target) => {
	if (!target || target.nodeType !== 1) return { action: 'ignore' };
	if (target.closest('a[href]')) return { action: 'navigate' };
	if (target.closest(PILL_SELECTOR)) return { action: 'pill' };
	if (target.closest(FORM_SELECTOR)) return { action: 'focus-control' };
	const tagged = target.closest(TAGGED_SELECTOR);
	if (tagged) return { action: 'select', el: tagged };
	return { action: 'clear' };
};
