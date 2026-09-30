// Plain-DOM (not React) — mouseover-driven, runs outside the React
// commit cycle to avoid dropped clicks under fast pointer movement.

import { track } from '@shared/lib/track';
import { __ } from '@wordpress/i18n';
import { useEditModeStore } from '../state/edit-mode';
import { useQuickEditStore } from '../state/store';
import { whenAnimationsSettle } from './after-animations';
import { escapesDynamicBlock, isAgentEligibleForTarget } from './agent-gate';
import {
	askAiAboutElement,
	hasAgentBlockSelected,
	isAgentAvailable,
	subscribeToAgentBlock,
} from './ask-ai';
import { prefetchBlockSource } from './block-source-cache';
import { decideClickAction } from './click-rule';
import { resolveTarget } from './dom';
import { needsContrastRing } from './over-media';
import { hasQuickEditModalFor } from './quick-edit-handlers';
import { hasSaver, saveSelected } from './save-bridge';
import {
	getTranslatedContext,
	isTextBearing,
	isTranslatedRender,
	translatedNoticeMessage,
} from './translated';

let hoverTarget = null;
let hoverBar = null;
let hoverOutline = null; // body-level positioned div, see ensureOutline()
let attached = false;

const debugLog = (label, el) => {
	if (!window.extQuickEditData?.debug) return;
	console.groupCollapsed(`[qe-debug] hover-bar: ${label}`);
	if (el) console.log('target:', el);
	console.trace();
	console.groupEnd();
};

// Body-level fixed overlay rather than an outline on each block:
// outline overhang would clip inside an ancestor's overflow:hidden,
// and a single repositioning overlay gets the smooth-expand feel
// for free via CSS transitions.
// Must match DOMHighlighter's minimum, or the outline resizes on click.
const MIN_OUTLINE_SIZE = 10;
const framed = (size) => Math.max(size, MIN_OUTLINE_SIZE);

const ensureOutline = () => {
	if (hoverOutline) return hoverOutline;
	hoverOutline = document.createElement('div');
	hoverOutline.className =
		'extendify-quick-edit extendify-quick-edit-hover-outline';
	hoverOutline.setAttribute('aria-hidden', 'true');
	document.body.appendChild(hoverOutline);
	return hoverOutline;
};

// `instant` skips the 0.2s CSS transition. Scroll-driven updates can't
// afford to animate: every scroll event would reset the transition target
// while the outline is still en route, so the outline visibly trails the
// content during a drag-scroll ("stays fixed in screen"). Hover-driven
// updates (block A → block B) keep the spring animation.
let dropSettle = () => {};

const positionOutline = (overlay, el, instant) => {
	if (instant) {
		overlay.style.transition = 'none';
	} else if (overlay.style.transition === 'none') {
		overlay.style.transition = '';
	}
	const r = el.getBoundingClientRect();
	const width = framed(r.width);
	const height = framed(r.height);
	overlay.style.top = `${r.top - (height - r.height) / 2}px`;
	overlay.style.left = `${r.left - (width - r.width) / 2}px`;
	overlay.style.width = `${width}px`;
	overlay.style.height = `${height}px`;
};

const showOutline = (el, { instant = false } = {}) => {
	const overlay = ensureOutline();
	positionOutline(overlay, el, instant);
	overlay.classList.toggle('is-over-media', needsContrastRing(el));
	overlay.classList.add('is-visible');
	dropSettle();
	dropSettle = whenAnimationsSettle(el, () =>
		positionOutline(overlay, el, true),
	);
	debugLog(instant ? 'showOutline (instant)' : 'showOutline', el);
};

const hideOutline = () => {
	dropSettle();
	hoverOutline?.classList.remove('is-visible');
	debugLog('hideOutline');
};

const removeOutline = () => {
	hoverOutline?.remove();
	hoverOutline = null;
};

const POST_ATTR = 'data-extendify-agent-block-id';
const PART_ATTR = 'data-extendify-part-block-id';
const PRODUCT_ATTR = 'data-extendify-quick-edit-product-id';
const WPFORM_FIELD_ATTR = 'data-extendify-quick-edit-wpform-field-id';
const MEDIATEXT_MEDIA_ATTR = 'data-extendify-quick-edit-mediatext-media';
const PART_SLUG_ATTR = 'data-extendify-part-slug';

// A synced pattern's blocks live in the wp_block post the id names; Quick
// Edit's save only ever writes the container, so it can't reach them.
const isSyncedPatternId = (id) => /^block:\d+:\d+$/.test(String(id ?? ''));

// DOMHighlighter's class; a sync listener can't read a React prop.
export const isAgentWorking = () =>
	!!document.querySelector('.wp-site-blocks.extendify-agent-working');

// Resolve the live DOM node for the currently-staged agent block, so the
// click + hover gates can carve out "inside the staged block." Returns
// null when no block is staged or its node has detached from the tree.
// Without the slug an id matches another part's block of the same number, and
// a click inside the staged block reads as an outside-click.
const stagedBlockEl = () => {
	const block = useQuickEditStore.getState().agentBlock;
	if (!block?.id) return null;
	const attr = block.target || POST_ATTR;
	const slug = block.source?.partSlug || null;
	const matches = [
		...document.querySelectorAll(`[${attr}="${CSS.escape(String(block.id))}"]`),
	];
	const inScope = matches.filter(
		(el) =>
			(el.closest(`[${PART_SLUG_ATTR}]`)?.getAttribute(PART_SLUG_ATTR) ??
				null) === slug,
	);
	return inScope[0] ?? matches[0] ?? null;
};

// Resolve the committed selection's live DOM node. buildTarget stashes
// the element reference on the descriptor; if the block has been swapped
// out (e.g. by an agent workflow) we treat the commit as gone.
const committedBlockEl = () => {
	const sel = useQuickEditStore.getState().committedSelection;
	if (!sel?.el || !document.body.contains(sel.el)) return null;
	return sel.el;
};

// Tries above first, falls back to below or inside. Placement is
// stored on the dataset so CSS can extend the bar's hover area via
// a ::before bridge in the right direction.
const positionBar = (bar, el) => {
	const rect = el.getBoundingClientRect();
	const bw = bar.offsetWidth;
	const bh = bar.offsetHeight || 36;
	const gap = 8;
	const vw = document.documentElement.clientWidth;
	const vh = document.documentElement.clientHeight;
	const adminBarH = document.getElementById('wpadminbar')?.offsetHeight ?? 0;
	const minTop = adminBarH + 4;

	let left = rect.left + (rect.width - bw) / 2;
	left = Math.max(4, Math.min(left, vw - bw - 4));

	let top = rect.top - bh - gap;
	let placement = 'above';
	if (top < minTop) {
		const below = rect.bottom + gap;
		const belowFits = below + bh + 4 <= vh;
		const visibleHeight = Math.min(rect.bottom, vh) - Math.max(rect.top, 0);
		const dominantBlock = visibleHeight > vh * 0.7;
		if (belowFits && !dominantBlock) {
			top = below;
			placement = 'below';
		} else {
			top = Math.max(minTop, rect.top + 4);
			placement = 'inside';
		}
	}
	bar.style.top = `${top}px`;
	bar.style.left = `${left}px`;
	bar.dataset.extendifyQuickEditPlacement = placement;
};

let translatedErrorEl = null;
let translatedErrorTimer = 0;

const clearTranslatedError = () => {
	if (translatedErrorTimer) {
		window.clearTimeout(translatedErrorTimer);
		translatedErrorTimer = 0;
	}
	translatedErrorEl?.remove();
	translatedErrorEl = null;
};

// Body-level notice anchored just under the hover bar, so it reads as "this
// block" and stays visible even with the Agent sidebar open (a top-right pill
// hides behind it). Inline-styled like the canvas ErrorPill — the bar lives
// outside the prefix-scoped stylesheet, so utility classes wouldn't reach it.
const showTranslatedError = (bar) => {
	clearTranslatedError();
	const el = document.createElement('div');
	el.className = 'extendify-quick-edit-translated-error';
	el.setAttribute('role', 'alert');
	el.textContent = translatedNoticeMessage(getTranslatedContext()?.plugin);
	const r = bar.getBoundingClientRect();
	Object.assign(el.style, {
		position: 'fixed',
		zIndex: '100001',
		maxWidth: '300px',
		padding: '8px 12px',
		borderRadius: '8px',
		background: '#fee2e2',
		color: '#991b1b',
		fontSize: '13px',
		lineHeight: '1.4',
		boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
		left: `${Math.max(4, r.left)}px`,
		top: `${r.bottom + 6}px`,
	});
	document.body.appendChild(el);
	translatedErrorEl = el;
	translatedErrorTimer = window.setTimeout(clearTranslatedError, 6000);
};

const clearBar = () => {
	if (hoverBar) {
		hoverBar.remove();
		hoverBar = null;
	}
	hoverTarget = null;
	hideOutline();
	clearTranslatedError();
};

// Walk past tagged-but-unsupported ancestors (e.g. core/post-title inside
// a cover's inner-container) so the bar resolves to the nearest editable
// parent. Without this, hovering the middle of a hero cover that
// surfaces post-title returned blockType=null and — combined with the
// template-part source gating Ask AI off — produced no bar at all.
const buildTarget = (el, fromEl = el) => {
	let current = resolveTarget(el);
	let safety = 5;
	while (
		current &&
		!current.blockType &&
		current.el?.parentElement &&
		safety-- > 0
	) {
		const next = resolveTarget(current.el.parentElement);
		if (!next) return current;
		current = next;
	}
	if (current && escapesDynamicBlock(fromEl, current.el)) {
		return { ...current, dynamicInterior: true };
	}
	return current;
};

// Picker blocks keep the bar visible because the dropdown anchors
// to it; text edits tear it down so the inline toolbar can replace
// it. Keep aligned with PICKER_STRATEGIES in components/InlineEditor.jsx.
const isPickerType = (blockType) =>
	blockType === 'core/image' ||
	blockType === 'core/cover' ||
	blockType === 'core/media-text:image' ||
	blockType === 'product:image';

// Translated text blocks have no editor — Quick Edit writes the source
// post_content while the screen shows the translation. We never commit a
// selection for them (it would render nothing and the unsubSelected cancel-on-
// clear logic would tear down a co-staged Ask AI block); the bar's Quick Edit
// pill shows the error inline instead, and Ask AI stays reachable.
const isTranslatedTextBlock = (target) =>
	isTranslatedRender() && isTextBearing(target?.blockType);

// Which pills a target would surface (without mounting the bar). A target
// with no pills isn't worth pinning. Exported so keyboard-entry gates Enter
// on the same signal the hover bar uses.
export const pillContextFor = (target) => {
	const quickEditEnabled = !!window.extQuickEditData?.quickEditEnabled;
	// A synced pattern is addressed off whichever tagger stamped it, so both
	// id spaces have to be checked or the pill returns on pages.
	const compositeId =
		target?.el?.getAttribute?.(PART_ATTR) ??
		target?.el?.getAttribute?.(POST_ATTR);
	const quickEditable =
		quickEditEnabled &&
		hasQuickEditModalFor(target?.blockType) &&
		!isSyncedPatternId(compositeId);
	const sourceKind = target?.source?.kind ?? null;
	// A ref-nav item routes Quick Edit's save through wp_navigation, but the
	// agent reaches it through the id the part tagger stamped.
	const agentSupportedSource =
		sourceKind === 'post' ||
		sourceKind === 'template-part' ||
		sourceKind === null ||
		(sourceKind === 'wp-navigation' &&
			!!target?.el?.getAttribute?.('data-extendify-part-block-id'));
	const aiAvailable =
		isAgentAvailable() &&
		agentSupportedSource &&
		isAgentEligibleForTarget(target);
	return { quickEditable, aiAvailable };
};

// Test seam for the Quick Edit pill's handler, which isn't exported.
export const editTarget = (target) => onEditClick(target);

const onEditClick = (target) => {
	const store = useQuickEditStore.getState();

	if (store.selected?.el === target.el) {
		store.setSelected(null);
		store.setCommittedSelection(null);
		clearBar();
		return;
	}

	// Translated text has no editor — leave the bar in place (its Quick Edit
	// pill shows the error) and don't commit a selection that renders nothing
	// and would cancel a co-staged Ask AI block on clear.
	if (isTranslatedTextBlock(target)) return;

	// Snapshot the bar rect before clearing — ImagePicker anchors to it.
	const anchorRect = hoverBar?.getBoundingClientRect() ?? null;
	const placement = hoverBar?.dataset.extendifyQuickEditPlacement ?? 'above';

	const isPicker = isPickerType(target.blockType);
	if (!isPicker) clearBar();
	// Order matters: clearing the commit first drops a picker's anchor bar.
	store.setSelected({ ...target, anchorRect, anchorPlacement: placement });
	store.setCommittedSelection(null);

	if (!isPicker) {
		track('quick_edit_action', {
			element: target.blockType,
			type: 'quick_edit',
		});
	}
};

const onAiClick = (el) => {
	// clearSelected before clearBar: when QE was clicked first on a
	// picker-type block (image / cover), `selected` is set and the
	// InlineEditor renders an ImagePicker dropdown anchored to the bar.
	// clearBar removes the bar but leaves the dropdown mounted as an
	// orphan; clearing `selected` first unmounts the InlineEditor too.
	const store = useQuickEditStore.getState();
	store.clearSelected();
	clearBar();
	store.setCommittedSelection(null);
	track('quick_edit_action', {
		element: resolveTarget(el)?.blockType ?? null,
		type: 'ask_ai',
	});
	askAiAboutElement(el);
};

// The Ask AI pill's handler, for callers holding an element, not a pill.
export const askAiTarget = (el) => onAiClick(el);

// Exported for keyboard-entry's focus-driven mount/dismiss.
export const showBar = (el) => renderBar(el);
export const hideBar = () => clearBar();

const renderBar = (el, fromEl = el) => {
	// While an agent block is staged, the hover bar is intentionally
	// hidden — only DOMHighlighter's X-close indicator is shown.
	// Defense in depth for any caller (a re-render, the keyboard
	// entry's showBar) that might otherwise paint a stale bar.
	if (hasAgentBlockSelected()) return;
	if (isAgentWorking()) return;

	const target = buildTarget(el, fromEl);
	const { quickEditable, aiAvailable } = pillContextFor(target);
	// Bail BEFORE clearing the current bar — when the cursor traverses
	// from a renderable block to an UNSUPPORTED tagged ancestor (e.g. a
	// tagged group with too many inner tagged blocks, or a tagged
	// post-title walked up to from inside), the previous behavior was
	// to clearBar() first and then bail, leaving the user with no bar
	// at all. Round-5 regression: cursor passing under the bar gap on
	// the way to a pill could land on the ancestor before reaching the
	// pill itself. Keep the existing bar in place if the new candidate
	// has nothing to render.
	if (!quickEditable && !aiAvailable) return;

	clearBar();

	// Position around the resolved target (which may be a walked-up
	// ancestor), not the original DOM node we entered on. media-text's
	// image is a child <figure> (mediaEl) of the block element — anchor the
	// outline + bar to it so the selector hugs the image, while Quick Edit
	// and Ask AI still act on the block element.
	const positionEl = target?.el ?? el;
	const anchorEl = target?.mediaEl ?? positionEl;
	hoverTarget = anchorEl;
	showOutline(anchorEl);

	// Prefetch source markup so BlockTextEditor's load effect hits the cache.
	// No-ops for sources the cache doesn't load (product/wpforms/nav).
	prefetchBlockSource(target?.source, target?.blockId);

	const bar = document.createElement('div');
	bar.className = 'extendify-quick-edit extendify-quick-edit-bar';
	bar.setAttribute('data-extendify-quick-edit-bar', '');
	// preventDefault on mousedown so clicks don't blur a contenteditable
	// in another open editor.
	const stopMouseDown = (ev) => ev.preventDefault();
	// Forward wheel events to the page scroller. The bar (and its
	// ::before hover bridge) sits over page content; with bar
	// pointer-events: auto, real-mouse wheel-scrolling stalled on the
	// bar in production. An earlier attempt at a CSS-only fix
	// (pointer-events: none on the wrapper) broke hover-
	// traversal block→pill. Restore pointer-events: auto
	// and own scroll in JS instead — gives us both behaviors.
	bar.addEventListener(
		'wheel',
		(ev) => {
			window.scrollBy({ left: ev.deltaX, top: ev.deltaY });
			ev.preventDefault();
		},
		{ passive: false },
	);

	if (quickEditable) {
		const editBtn = document.createElement('button');
		editBtn.type = 'button';
		editBtn.className = 'extendify-quick-edit-pill';
		editBtn.setAttribute('data-extendify-quick-edit-pill', '');
		editBtn.innerHTML = '<span aria-hidden="true">✎</span>';
		editBtn.append(__('Quick Edit', 'extendify-local'));
		editBtn.addEventListener('mousedown', stopMouseDown);
		editBtn.addEventListener('click', (ev) => {
			ev.preventDefault();
			ev.stopPropagation();
			// Translated text can't be edited (we'd overwrite the source) — show
			// the error right under the bar and leave the bar (with Ask AI) in
			// place rather than opening a canvas.
			if (isTranslatedTextBlock(target)) {
				showTranslatedError(bar);
				return;
			}
			onEditClick(target);
		});
		bar.appendChild(editBtn);
	}

	if (aiAvailable) {
		const aiBtn = document.createElement('button');
		aiBtn.type = 'button';
		aiBtn.className = 'extendify-quick-edit-pill extendify-quick-edit-pill-ai';
		aiBtn.setAttribute('data-extendify-quick-edit-pill', '');
		aiBtn.innerHTML = '<span aria-hidden="true">✦</span>';
		aiBtn.append(__('Ask AI', 'extendify-local'));
		aiBtn.addEventListener('mousedown', stopMouseDown);
		aiBtn.addEventListener('click', (ev) => {
			ev.preventDefault();
			ev.stopPropagation();
			onAiClick(positionEl);
		});
		bar.appendChild(aiBtn);
	}

	const closeBtn = document.createElement('button');
	closeBtn.type = 'button';
	closeBtn.className =
		'extendify-quick-edit-pill extendify-quick-edit-pill-close';
	closeBtn.setAttribute('data-extendify-quick-edit-pill', '');
	closeBtn.setAttribute('aria-label', __('Dismiss', 'extendify-local'));
	closeBtn.innerHTML = '<span aria-hidden="true">✕</span>';
	closeBtn.addEventListener('mousedown', stopMouseDown);
	closeBtn.addEventListener('click', (ev) => {
		ev.preventDefault();
		ev.stopPropagation();
		useQuickEditStore.getState().setCommittedSelection(null);
		clearBar();
	});
	bar.appendChild(closeBtn);

	document.body.appendChild(bar);
	hoverBar = bar;
	syncDismissState();
	positionBar(bar, anchorEl);
};

// Nothing to dismiss until a click pins the bar; hover ends with the pointer.
const syncDismissState = () => {
	const closeBtn = hoverBar?.querySelector('.extendify-quick-edit-pill-close');
	if (!closeBtn) return;
	closeBtn.disabled = !useQuickEditStore.getState().committedSelection;
};

// preventScroll: the pill is already on screen; scrolling to it jumps the page.
const focusFirstPill = () => {
	hoverBar
		?.querySelector('.extendify-quick-edit-pill')
		?.focus({ preventScroll: true });
};

export const pinTarget = (el, target = buildTarget(el)) => {
	const { quickEditable, aiAvailable } = pillContextFor(target);
	const store = useQuickEditStore.getState();
	if (!quickEditable && !aiAvailable) {
		store.setCommittedSelection(null);
		clearBar();
		return;
	}
	renderBar(el);
	store.setCommittedSelection(target);
	syncDismissState();
	focusFirstPill();
};

// Walk up to the innermost tagged ancestor. resolveTarget then derives
// blockType from that element's wp-block-* class; the pill renderer
// decides which pills (if any) to show. Lighter than resolveTarget —
// onMouseOver hot path doesn't need the full descriptor.
const findTagged = (start) => {
	let node = start;
	while (node && node.nodeType === 1 && node !== document.body) {
		if (
			node.hasAttribute?.(POST_ATTR) ||
			node.hasAttribute?.(PART_ATTR) ||
			node.hasAttribute?.(PRODUCT_ATTR) ||
			node.hasAttribute?.(WPFORM_FIELD_ATTR) ||
			node.hasAttribute?.(MEDIATEXT_MEDIA_ATTR)
		) {
			return node;
		}
		node = node.parentElement;
	}
	return null;
};

const onMouseOver = (e) => {
	if (!useEditModeStore.getState().on) return;
	if (useQuickEditStore.getState().selected) return;
	if (isAgentWorking()) return;
	// Sticky modes hard-suppress all hover-driven bar movement.
	// - agentBlock staged: the bar is intentionally hidden; only
	//   DOMHighlighter's X-close is shown. To re-engage Ask AI on the
	//   same block, the user clicks X-close (clears agentBlock) then
	//   re-hovers / re-clicks.
	// - committedSelection: the bar is pinned to the committed element.
	//   Hover anywhere else — including tagged inner blocks of a
	//   committed container — leaves the bar where it is. To select a
	//   different block, the user clicks outside or presses Esc first.
	if (hasAgentBlockSelected()) return;
	if (useQuickEditStore.getState().committedSelection) return;
	if (hoverBar && (e.target === hoverBar || hoverBar.contains(e.target))) {
		return;
	}
	const el = findTagged(e.target);
	if (el === hoverTarget) return;
	if (!el) return;
	renderBar(el, e.target);
};

const onScrollOrResize = () => {
	if (!hoverTarget) return;
	if (hoverBar) positionBar(hoverBar, hoverTarget);
	if (hoverOutline?.classList.contains('is-visible')) {
		showOutline(hoverTarget, { instant: true });
	}
};

// Capture-phase so we win against any underlying handler (link nav,
// contact form submit, theme JS) — we either commit the click as a
// selection, let it through, or clear the bar. Decision per `decideClickAction`.
// The hover bar itself is in this list so clicks on it (the pills) bail
// before the committed-selection clear branch fires — pill handlers run on
// bubble and need the bar to still be in the DOM.
//
// WP popovers (LinkControl + format-toolbar in the canvas) get explicit
// entries too: the popover may end up portaled inside a tagged ancestor
// (BlockTools' Popover.Slot lives inside our canvas, which can be a
// descendant of `[data-extendify-agent-block-id]`). Without these
// entries, the capture handler routes the click to the tagged ancestor
// via decideClickAction's `select` branch, preventDefault eats the
// click, and the URL input never focuses.
const QE_INTERIOR = [
	'.extendify-quick-edit-bar',
	'.extendify-quick-edit-canvas',
	'.extendify-quick-edit-floating-bar',
	'.extendify-quick-edit-image-menu',
	'.extendify-quick-edit-modal',
	'.extendify-quick-edit-modal-root',
	'.block-editor-link-control',
	'.components-popover',
	'#extendify-agent-main',
	'#extendify-agent-dom-mount',
	'#wpadminbar',
	// The wp.media library (the Agent's "Change image" picker and QE's own
	// image flows). Without this, clicking an image in the grid reads as an
	// outside-click: it clears the staged agentBlock and cancels the in-flight
	// agent workflow, unmounting the picker's confirm component and orphaning
	// the modal as a stuck white overlay.
	'.media-modal',
	'.media-modal-backdrop',
].join(', ');

const onDocClickCapture = (e) => {
	if (!useEditModeStore.getState().on) return;
	if (e.target?.closest?.(QE_INTERIOR)) return;
	// Below QE_INTERIOR, or a run also deadens the sidebar and canvas.
	if (isAgentWorking()) return;

	// Implicit close on the QE text-edit canvas: clicks outside the canvas
	// while it's open save the in-flight edits instead of discarding them.
	// `hasSaver()` is false for picker blocks (image / cover) — they save
	// synchronously on pick and never register. Fall through either way so
	// the existing agentBlock-clear + clear-bar branches still run.
	if (hasSaver() && useQuickEditStore.getState().selected) {
		saveSelected();
	}

	// Soft selection: while a block is staged for Ask AI, clicks INSIDE
	// the staged block route natively (anchor navigates, form control
	// focuses, text-content click is a no-op) — EXCEPT when they land on
	// a tagged descendant block, in which case the same gesture swaps
	// the stage onto the descendant (drill-in parity with the cross-
	// sibling swap below). Clicks OUTSIDE clear the staged block —
	// sidebar stays open. The asymmetry is intentional: closing the
	// sidebar still cascades to clearing the block (handled in
	// Agent.jsx), but clearing the block here does NOT close the
	// sidebar.
	if (hasAgentBlockSelected()) {
		const staged = stagedBlockEl();
		if (staged?.contains(e.target)) {
			const innerTagged = findTagged(e.target);
			if (!innerTagged || innerTagged === staged) return;
		}
		useQuickEditStore.setState({ agentBlock: null, agentBlockCode: null });
		// Fall through to decideClickAction only when the click lands on a
		// tagged block (sibling or descendant) — the cross-block gesture
		// transitions both surfaces (QE + agent re-stage) in one click.
		// Whitespace / non-tagged outside-clicks return here: the same
		// gesture that clears the staged block shouldn't commit a new
		// selection out of empty space.
		if (!findTagged(e.target)) return;
	}

	// Sticky pre-pill-action selection: a prior click committed a block.
	// Inside-clicks route natively (anchor / form control) — EXCEPT when
	// they land on a tagged descendant, which swaps the commit onto the
	// descendant in the same gesture. Outside-clicks clear the commit; if
	// the same click also lands on a different tagged block, the switch
	// below commits it in the same gesture so a single click swaps the
	// selection. Pills bail above via QE_INTERIOR so they aren't treated
	// as outside-clicks.
	if (useQuickEditStore.getState().committedSelection) {
		const committedEl = committedBlockEl();
		if (committedEl?.contains(e.target)) {
			const innerTagged = findTagged(e.target);
			if (!innerTagged || innerTagged === committedEl) return;
		}
		useQuickEditStore.getState().setCommittedSelection(null);
		clearBar();
	}

	const result = decideClickAction(e.target);
	switch (result.action) {
		case 'select': {
			e.preventDefault();
			e.stopPropagation();
			const store = useQuickEditStore.getState();
			// Only pickers reach this — other canvases cover the block they
			// opened on.
			if (store.selected?.el === result.el) {
				store.clearSelected();
				store.setCommittedSelection(null);
				clearBar();
				return;
			}
			// stopPropagation above blocks ImagePicker's bubble-phase
			// outside-click — without this clear its menu lingers (issue 19).
			if (store.selected && isPickerType(store.selected.blockType)) {
				store.clearSelected();
			}
			pinTarget(result.el);
			return;
		}
		case 'clear':
			clearBar();
			return;
		default:
			return;
	}
};

let unsubEditMode = null;
let unsubSelected = null;
let unsubAgentBlock = null;
let workingObserver = null;
let unsubCommitted = null;

export const attach = () => {
	if (attached) return;
	attached = true;
	document.addEventListener('mouseover', onMouseOver, true);
	window.addEventListener('scroll', onScrollOrResize, true);
	window.addEventListener('resize', onScrollOrResize);
	document.addEventListener('click', onDocClickCapture, true);

	unsubEditMode = useEditModeStore.subscribe((state) => {
		if (!state.on) {
			useQuickEditStore.getState().setCommittedSelection(null);
			clearBar();
		}
	});
	// committedSelection → null transition: Esc / programmatic clears
	// don't go through onDocClickCapture, so they wouldn't otherwise
	// remove the bar. Fire clearBar here. The outside-click path
	// already calls clearBar synchronously; this subscriber's clearBar
	// is idempotent in that case.
	let lastCommitted = useQuickEditStore.getState().committedSelection;
	unsubCommitted = useQuickEditStore.subscribe((state) => {
		const prev = lastCommitted;
		lastCommitted = state.committedSelection;
		if (!prev || state.committedSelection) return;
		// A picker dropdown anchors to the bar; clearing here orphans it.
		if (isPickerType(state.selected?.blockType)) return;
		clearBar();
	});
	// Picker dropdown anchors to the bar; keep it visible for those.
	// On the non-null → null transition (Esc / Cancel / Save closes the
	// canvas) the bar is re-rendered on the previously edited element
	// without waiting for a mouse-cross — mouseover only fires when the
	// cursor crosses an element boundary, so a user who Escs without
	// moving the cursor would otherwise see the bar disappear and stay
	// gone until they nudged the mouse.
	let lastSelected = useQuickEditStore.getState().selected;
	unsubSelected = useQuickEditStore.subscribe((state) => {
		// The store carries multiple slots (selected / committedSelection /
		// agentBlock / dirty / error). Without this gate, an unrelated write
		// like setCommittedSelection(null) in onEditClick would fire this
		// listener while state.selected was still the prior non-picker
		// block — clearBar would then tear down the bar that renderBar
		// just mounted for the new picker target.
		if (state.selected === lastSelected) return;
		const prev = lastSelected;
		lastSelected = state.selected;
		if (state.selected) {
			if (!isPickerType(state.selected.blockType)) clearBar();
			return;
		}
		// Canvas closing (Esc / Cancel / Save / programmatic clearSelected)
		// on the same block the agent is staged on should also clear the
		// stage — otherwise the dashed outline + X-close indicator linger
		// after the user dismissed the canvas. The two-pill silent-stage
		// shape sets both slots from one click, so closing the canvas is
		// the symmetric "I'm done with this block" gesture.
		const agentBlock = useQuickEditStore.getState().agentBlock;
		if (
			prev?.blockId != null &&
			agentBlock?.id != null &&
			String(prev.blockId) === String(agentBlock.id)
		) {
			window.dispatchEvent(new CustomEvent('extendify-agent:cancel-workflow'));
			useQuickEditStore.getState().setAgentBlock(null);
		}
		if (!prev?.el || !document.body.contains(prev.el)) return;
		if (!useEditModeStore.getState().on) return;
		if (hoverTarget === prev.el && hoverBar) return;
		// A save resolves after a newer pin; re-rendering here steals its bar.
		const committed = useQuickEditStore.getState().committedSelection;
		if (committed?.el && committed.el !== prev.el) return;
		renderBar(prev.el);
	});
	unsubAgentBlock = subscribeToAgentBlock((hasBlock) => {
		if (hasBlock) clearBar();
	});
	// A bar mounted before the run began stays clickable otherwise.
	workingObserver = new MutationObserver(() => {
		if (!isAgentWorking()) return;
		// Otherwise hover stays suppressed after the workflow ends.
		useQuickEditStore.getState().setCommittedSelection(null);
		clearBar();
	});
	const root = document.querySelector('.wp-site-blocks');
	if (root) {
		workingObserver.observe(root, {
			attributes: true,
			attributeFilter: ['class'],
		});
	}
};

export const detach = () => {
	if (!attached) return;
	attached = false;
	document.removeEventListener('mouseover', onMouseOver, true);
	window.removeEventListener('scroll', onScrollOrResize, true);
	window.removeEventListener('resize', onScrollOrResize);
	document.removeEventListener('click', onDocClickCapture, true);
	unsubEditMode?.();
	unsubSelected?.();
	unsubAgentBlock?.();
	workingObserver?.disconnect();
	unsubCommitted?.();
	unsubEditMode = null;
	unsubSelected = null;
	unsubAgentBlock = null;
	workingObserver = null;
	unsubCommitted = null;
	clearBar();
	removeOutline();
};
