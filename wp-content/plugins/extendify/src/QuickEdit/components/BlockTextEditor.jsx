import {
	BlockEditorProvider,
	BlockList,
	BlockToolbar,
	BlockTools,
	ObserveTyping,
	WritingFlow,
} from '@wordpress/block-editor';
// Don't deep-import @wordpress/format-library/build-module — webpack-asset-php
// emits invalid script handles for those paths and the enqueue silently fails.
// Use the wp.formatLibrary global at runtime instead.
import { registerCoreBlocks } from '@wordpress/block-library';

// The blocks QE's text canvas parses/serializes through.
const QE_REQUIRED_BLOCKS = ['core/paragraph', 'core/heading', 'core/button'];

// True when every block QE edits is in the live registry. With no inspectable
// registry (unit-test env, no window.wp) it returns true — fail open, matching
// the pre-hardening behavior.
const requiredBlocksAvailable = () => {
	const getBlockType = window.wp?.blocks?.getBlockType;
	if (typeof getBlockType !== 'function') return true;
	return QE_REQUIRED_BLOCKS.every((name) => !!getBlockType(name));
};

// Foreign (non-core) rich-text formats register into the shared wp.richText
// registry, and <BlockToolbar> then auto-renders a button for each — e.g.
// Spectra's `zipai/chat` "AI Assistant" lands between our alignment and bold
// controls. Drop every non-core format so only core's bold/italic/link show
// (the rest sit in the CSS-hidden "More" overflow) beside our own buttons.
// core/text-color stays registered — our ColorButton serializes through it —
// and content using a dropped format round-trips verbatim via core/unknown,
// so this never corrupts a save.
export const pruneForeignFormats = () => {
	const rt = window.wp?.richText;
	if (typeof rt?.unregisterFormatType !== 'function') return;
	// getFormatTypes lives on the core/rich-text data store in current WP;
	// fall back to the rich-text package export for older runtimes.
	const store = window.wp?.data?.select?.('core/rich-text');
	const types =
		(typeof store?.getFormatTypes === 'function'
			? store.getFormatTypes()
			: rt.getFormatTypes?.()) || [];
	for (const t of types) {
		if (t?.name && !t.name.startsWith('core/')) {
			try {
				rt.unregisterFormatType(t.name);
			} catch {
				// best-effort — another runtime may already have dropped it
			}
		}
	}
};

export const ensureRegistered = () => {
	// Register when a block QE edits is missing — not only when the registry is
	// empty. A second plugin that loaded @wordpress/blocks and registered its
	// own block leaves getBlockTypes().length > 0 while core/* is still absent;
	// the old `length === 0` gate skipped registration and QE then round-tripped
	// core/paragraph through a registry that has no core/paragraph.
	if (window.wp?.blocks?.getBlockType && !requiredBlocksAvailable()) {
		try {
			registerCoreBlocks();
		} catch (e) {
			console.warn('[QE] registerCoreBlocks:', e?.message);
		}
	}
	if (
		window.wp?.formatLibrary &&
		window.wp?.richText?.getFormatTypes?.()?.length === 0
	) {
		const lib = window.wp.formatLibrary;
		const reg = window.wp.richText.registerFormatType;
		for (const key of Object.keys(lib)) {
			const m = lib[key];
			if (m?.name && m?.title && !window.wp.richText.getFormatType(m.name)) {
				try {
					reg(m.name, m);
				} catch {
					// idempotent
				}
			}
		}
	}
	pruneForeignFormats();
	return requiredBlocksAvailable();
};
ensureRegistered();

import { track } from '@shared/lib/track';
import { parse, serialize } from '@wordpress/blocks';
import { Popover } from '@wordpress/components';
import { useDispatch, useRegistry, useSelect } from '@wordpress/data';
import { createPortal, useEffect, useRef, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { isAgentEligibleForTarget } from '../lib/agent-gate';
import { save } from '../lib/api';
import { askAiAboutElement, isAgentAvailable } from '../lib/ask-ai';
import {
	getBlockSource,
	invalidateBlockSource,
} from '../lib/block-source-cache';
import { splice } from '../lib/dom';
import { friendlyMessage } from '../lib/errors';
import { normalizedTextEquals, textFingerprint } from '../lib/fingerprint';
import { fetchLinkSuggestions } from '../lib/link-suggestions';
import { registerSaver, unregisterSaver } from '../lib/save-bridge';
import { useQuickEditStore } from '../state/store';
import { pushUndo } from '../state/undo';
import { ColorButton } from './toolbar/ColorButton';
import { HeadingLevelButton } from './toolbar/HeadingLevelButton';
import { TextAlignButtons } from './toolbar/TextAlignButtons';

// AutoSelectFirstBlock needs the rich-text attribute key per block name —
// selectBlock alone doesn't flip RichText's isSelected; BlockToolbar reads
// off selectionStart.attributeKey.
const RICHTEXT_ATTR_BY_BLOCK = {
	'core/paragraph': 'content',
	'core/heading': 'content',
	'core/verse': 'content',
	'core/button': 'text',
	'core/pullquote': 'value',
	'core/code': 'content',
	'core/preformatted': 'content',
};

// A header phone CTA is a paragraph whose entire text is a single `tel:` link —
// an inline rich-text format, unlike a button's block-level link. When the whole
// block is one link, return its [start, end] offsets so the caller can select
// it: an active core/link format makes WP surface its inline link editor on open
// and point the toolbar link button at the existing link instead of creating a
// new one. Returns null for plain text or a paragraph only partly linked, which
// stay at a collapsed caret (no spurious link UI). Reads the live rich-text
// runtime; degrades to null when it's absent.
const fullLinkRange = (content) => {
	const create = window.wp?.richText?.create;
	if (typeof create !== 'function') return null;
	const html =
		typeof content === 'string' ? content : content?.toHTMLString?.();
	// No anchor → can't be a single link. Bail before the rich-text parse
	// below, which otherwise runs on every block open (plain paragraph,
	// heading, button) for no reason.
	if (!html || !html.includes('<a')) return null;
	let value;
	try {
		value = create({ html });
	} catch {
		return null;
	}
	const length = value?.text?.length ?? 0;
	if (!length) return null;
	for (let i = 0; i < length; i++) {
		const formats = value.formats?.[i];
		if (!formats?.some?.((f) => f?.type === 'core/link')) return null;
	}
	return { start: 0, end: length };
};

const AutoSelectFirstBlock = () => {
	const dispatch = useDispatch('core/block-editor');
	const registry = useRegistry();
	const first = useSelect((select) => {
		const editor = select('core/block-editor');
		const clientId = editor.getBlockOrder()[0];
		if (!clientId) return null;
		return { clientId, name: editor.getBlock(clientId)?.name };
	}, []);
	useEffect(() => {
		if (!first || !dispatch?.selectBlock) return;
		dispatch.selectBlock(first.clientId, 0);
		const attrKey = RICHTEXT_ATTR_BY_BLOCK[first.name];
		if (attrKey && dispatch.selectionChange) {
			// Read the block content imperatively so this effect keys off the
			// stable block identity only. Pulling attributes into the reactive
			// `first` above would re-run it on every keystroke and reset the
			// caret to offset 0, reversing the typed text.
			const block = registry
				.select('core/block-editor')
				.getBlock(first.clientId);
			const linkRange = fullLinkRange(block?.attributes?.[attrKey]);
			dispatch.selectionChange(
				first.clientId,
				attrKey,
				linkRange?.start ?? 0,
				linkRange?.end ?? 0,
			);
		}
		// preventScroll keeps the scroll-preservation effect intact.
		// Two RAFs wait for React commit + browser paint.
		let r2 = 0;
		const r1 = requestAnimationFrame(() => {
			r2 = requestAnimationFrame(() => {
				const editable = document.querySelector(
					'.extendify-quick-edit-canvas .block-editor-rich-text__editable',
				);
				if (editable && document.body.contains(editable)) {
					editable.focus({ preventScroll: true });
				}
			});
		});
		return () => {
			cancelAnimationFrame(r1);
			if (r2) cancelAnimationFrame(r2);
		};
	}, [first, dispatch, registry]);
	return null;
};

// Equivalent to "Detach pattern" in core: drops metadata.patternName so
// block-editor doesn't lock the block and suppress the format toolbar.
const sanitizeForEditor = (block) => {
	if (!block || typeof block !== 'object') return block;
	const meta = block.attributes?.metadata;
	const next = { ...block };
	if (meta && 'patternName' in meta) {
		const { patternName: _drop, ...rest } = meta;
		const nextMeta = Object.keys(rest).length ? rest : undefined;
		next.attributes = { ...block.attributes };
		if (nextMeta) {
			next.attributes.metadata = nextMeta;
		} else {
			delete next.attributes.metadata;
		}
	}
	if (Array.isArray(block.innerBlocks) && block.innerBlocks.length) {
		next.innerBlocks = block.innerBlocks.map(sanitizeForEditor);
	}
	return next;
};

// Walk up looking for an ancestor with a non-transparent background so the
// editor host can be made opaque. The canvas grows downward as the user types,
// extending past the live block's bounds; without a background, the next block
// in flow (still mounted, just not pushed down by our absolutely-positioned
// host) bleeds through behind the editor.
const findOpaqueBackground = (el) => {
	// Inside a cover block: extract the overlay tint from the cover's
	// `.wp-block-cover__background` direct-child span. Gutenberg paints
	// the dim/overlay there, not on the cover div itself — the cover's
	// own background-color is almost always transparent. The dim ratio
	// shows up as CSS `opacity` on the span (via `has-background-dim-N`),
	// so combine the span's bg-color with its opacity into a single rgba
	// the host can use as a flat background-color (host opacity stays 1
	// so descendant text isn't affected).
	// Image-only covers (dim-0 or transparent overlay) fall back to a
	// semi-transparent black floor so overflow text typed past the
	// cover's height has a legible backdrop. Canvas-only; never
	// persisted to save.
	const cover = el?.closest?.('.wp-block-cover');
	if (cover) {
		const span = cover.querySelector(':scope > .wp-block-cover__background');
		if (span) {
			const style = window.getComputedStyle(span);
			const opacity = parseFloat(style.opacity);
			const match = style.backgroundColor.match(
				/^rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)$/,
			);
			if (match && opacity > 0.01) {
				const [, r, g, b, a = '1'] = match;
				const alpha = parseFloat(a) * opacity;
				if (alpha > 0.01) {
					return `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(3)})`;
				}
			}
		}
		return 'rgba(0, 0, 0, 0.5)';
	}
	let n = el?.parentElement;
	while (n && n !== document.documentElement) {
		const bg = window.getComputedStyle(n).backgroundColor;
		if (bg && bg !== 'transparent' && bg !== 'rgba(0, 0, 0, 0)') {
			return bg;
		}
		n = n.parentElement;
	}
	return '';
};

// Compensates for the Agent sidebar's wp-site-blocks scale so editor host
// coords line up with viewport-pixel rects.
const getAncestorScale = (el) => {
	let scale = 1;
	let n = el?.parentElement;
	while (n && n !== document.body) {
		const t = window.getComputedStyle(n).transform;
		if (t && t !== 'none') {
			const m = /matrix\(([^)]+)\)/.exec(t);
			if (m) {
				const a = parseFloat(m[1].split(',')[0]);
				if (Number.isFinite(a) && a > 0) scale *= a;
			}
		}
		n = n.parentElement;
	}
	return scale;
};

export const BlockTextEditor = ({ selected }) => {
	const [blocks, setBlocks] = useState(null);
	const [loadError, setLoadError] = useState(null);
	const [saving, setSaving] = useState(false);
	const [saveError, setSaveError] = useState(null);
	const [host, setHost] = useState(null);
	const [barHost, setBarHost] = useState(null);
	// saveRef keeps the freshest handler since the Cmd+Enter binding is one-shot.
	const saveRef = useRef(null);
	const beforeRawBlockRef = useRef(null);
	const statusRef = useRef(null);

	const clearSelected = useQuickEditStore((s) => s.clearSelected);
	// Singleton store: stale selection from a prior session leaves BlockToolbar empty on remount.
	const blockEditorDispatch = useDispatch('core/block-editor');

	const sourceKind = selected.source?.kind ?? null;
	const agentSupportedSource = sourceKind === 'post' || sourceKind === null;
	const aiAvailable =
		isAgentAvailable() &&
		agentSupportedSource &&
		isAgentEligibleForTarget(selected);

	const handleAskAiClick = async () => {
		const el = selected.el;
		// Await save before staging — the hover-bar bridge reads save's
		// setSelected(null) as "user dismissed the canvas" and would clear
		// agentBlock if askAi staged it first. Save's clearSelected runs
		// while agentBlock is still null, so the bridge no-ops; askAi then
		// stages cleanly. The captured el can detach via splice but only
		// its agent-block id is used downstream.
		await saveRef.current?.();
		askAiAboutElement(el);
	};

	// post and template-part both load through get-block-code (the cache keys
	// them apart); anything else (product/wpforms/nav) uses its own editor and
	// never reaches this canvas.
	const loadableSource =
		sourceKind === 'post' || sourceKind === 'template-part'
			? selected.source
			: null;
	useEffect(() => {
		if (!loadableSource || !selected.blockId) return;
		// Refuse to edit through a runtime that can't provide the core blocks the
		// canvas serializes — a clean "try again" beats silently round-tripping
		// core/paragraph through a foreign @wordpress/blocks (block invalidation
		// or markup drift on save).
		if (!ensureRegistered()) {
			setLoadError(friendlyMessage());
			return;
		}
		let alive = true;
		// Reuses the hover-bar prefetch so the editor mounts with no round-trip wait.
		getBlockSource(loadableSource, selected.blockId)
			.then((res) => {
				if (!alive) return;
				if (!res?.block) {
					setLoadError(friendlyMessage());
					return;
				}
				// Capture pre-parse — parse/serialize would nudge the markup
				// and the undo entry needs the server's exact bytes back.
				beforeRawBlockRef.current = res.block;
				const parsed = parse(res.block).map(sanitizeForEditor);
				setBlocks(parsed);
			})
			.catch((err) => {
				if (!alive) return;
				setLoadError(friendlyMessage(err));
			});
		return () => {
			alive = false;
		};
	}, [loadableSource, selected.blockId]);

	// Flush stale singleton state before BlockEditorProvider's resetBlocks runs.
	useEffect(() => {
		if (!blockEditorDispatch?.resetBlocks) return;
		blockEditorDispatch.resetBlocks([]);
		blockEditorDispatch.clearSelectedBlock?.();
		blockEditorDispatch.resetSelection?.(
			{ clientId: null, attributeKey: null, offset: 0 },
			{ clientId: null, attributeKey: null, offset: 0 },
		);
	}, [blockEditorDispatch, selected.blockId]);

	// Sibling-of-live mount: shares the live block's transform context and
	// stays outside the Tailwind preflight scope so BlockEditor keeps its
	// native styling. Live element is hidden later, after blocks paint.
	useEffect(() => {
		const live = selected.el;
		if (!live?.isConnected || !live.parentNode) return;

		const node = document.createElement('div');
		node.className = 'extendify-quick-edit extendify-quick-edit-host';
		node.dataset.test = 'quick-edit-host';
		node.style.position = 'absolute';
		node.style.top = '0px';
		node.style.left = '0px';
		node.style.margin = '0';
		node.style.zIndex = '99998';
		// Stays hidden until the editable's text catches up to the live
		// block's text — BlockEditorProvider's sub-registry briefly paints
		// the prior session's blocks via use-block-sync's post-commit
		// resetBlocks effect. Reveal in lockstep with the live-hide swap
		// below so the user never sees the wrong content inside the canvas.
		node.style.visibility = 'hidden';
		const opaqueBg = findOpaqueBackground(live);
		if (opaqueBg) node.style.backgroundColor = opaqueBg;
		// Cover-block-specific: also copy the cover's background-image to
		// the host so overflow text (typed past the live block's height)
		// reads on the cover's image rather than the bare page background
		// below. The image is "scoped" to the host (heading-sized) so it
		// won't perfectly continue from the cover, but it's enough for
		// legibility. Combined with the cover's overlay color above
		// (handled by findOpaqueBackground), the host visually echoes the
		// cover. Image-only covers (no overlay) still get the image — the
		// overlay color may be transparent in that case.
		const cover = live?.closest?.('.wp-block-cover');
		if (cover) {
			const imgBg = cover.querySelector('.wp-block-cover__image-background');
			if (imgBg) {
				const imgStyle = window.getComputedStyle(imgBg);
				if (imgStyle.backgroundImage && imgStyle.backgroundImage !== 'none') {
					node.style.backgroundImage = imgStyle.backgroundImage;
					node.style.backgroundSize = imgStyle.backgroundSize || 'cover';
					node.style.backgroundPosition =
						imgStyle.backgroundPosition || 'center';
					node.style.backgroundRepeat = 'no-repeat';
				}
			}
		}
		// Pin the live anchor's computed color so the canvas's link doesn't
		// flip to the theme's :hover color while the user's cursor sits over
		// the text area mid-edit. live is `visibility: hidden`, so its own
		// :hover never fires and its computed color is the resting value.
		// Exposed as a CSS var consumed by quick-edit.css.
		const liveLink = live.querySelector?.('a');
		if (liveLink) {
			const liveColor = window.getComputedStyle(liveLink).color;
			if (liveColor) node.style.setProperty('--qe-link-color', liveColor);
		}
		live.parentNode.insertBefore(node, live.nextSibling);

		// Body-level fixed bar so it lives in the root stacking context.
		// Inside .wp-block-cover, the cover-background span (opacity:0, its
		// own stacking context) hijacks Chrome's hit-testing and the toolbar
		// becomes visible-but-unclickable.
		const bar = document.createElement('div');
		bar.className = 'extendify-quick-edit extendify-quick-edit-floating-bar';
		bar.dataset.test = 'quick-edit-floating-bar';
		bar.style.position = 'fixed';
		bar.style.zIndex = '100002';
		bar.style.visibility = 'hidden';
		bar.setAttribute('role', 'toolbar');
		bar.setAttribute('aria-label', __('Quick Edit toolbar', 'extendify-local'));
		// preventDefault on mousedown so a toolbar click doesn't blur the contenteditable.
		bar.addEventListener('mousedown', (ev) => ev.preventDefault());
		document.body.appendChild(bar);

		const align = () => {
			if (!live.isConnected || !node.isConnected) return;
			const liveRect = live.getBoundingClientRect();
			const op = node.offsetParent;
			if (!op) return;
			const scale = getAncestorScale(node) || 1;
			// Derive the host's positioning origin from where it currently
			// renders, not from offsetParent's box: a static <body> is the
			// reported offsetParent but an absolute child resolves against the
			// viewport, not body's box. So when the admin bar / Simple Toolbar
			// adds `html { margin-top:32px }` (e.g. on Playground), subtracting
			// body's rect lifts the host by that margin and the floating bar
			// overlaps the editable. Measuring the live origin is correct for
			// every case (static body, positioned ancestor, scaled sidebar) and
			// self-corrects instead of guessing the containing block.
			const curTop = parseFloat(node.style.top) || 0;
			const curLeft = parseFloat(node.style.left) || 0;
			const nodeRect = node.getBoundingClientRect();
			const originTop = nodeRect.top - curTop * scale;
			const originLeft = nodeRect.left - curLeft * scale;
			node.style.top = `${(liveRect.top - originTop) / scale}px`;
			node.style.left = `${(liveRect.left - originLeft) / scale}px`;
			node.style.width = `${liveRect.width / scale}px`;
			node.style.minHeight = `${liveRect.height / scale}px`;
			if (bar.isConnected) {
				bar.style.top = `${liveRect.top - 52}px`;
				// Clamp horizontally — for a live element near the right edge of
				// the viewport the bar's full width would otherwise extend off
				// screen (the bar is fixed-positioned and ~600px wide once the
				// toolbar groups + colors + actions render).
				const bw = bar.offsetWidth;
				const vw = document.documentElement.clientWidth;
				let left = liveRect.left;
				if (bw && left + bw > vw - 4) {
					left = Math.max(4, vw - bw - 4);
				}
				bar.style.left = `${Math.max(4, left)}px`;
			}
		};
		align();
		// Re-align over two frames in case font/image loads shift measurements.
		requestAnimationFrame(() => {
			align();
			requestAnimationFrame(align);
		});

		setHost(node);
		setBarHost(bar);

		const ro = new ResizeObserver(align);
		ro.observe(live);
		// Also watch the bar: it mounts at 0px width and only reaches its real
		// ~600px once the toolbar content portals in, so the right-edge clamp
		// in align() no-ops on the first pass and must recompute when the bar
		// resizes. align() only moves the bar (top/left), never resizes it, so
		// this can't loop.
		ro.observe(bar);
		window.addEventListener('scroll', align, {
			capture: true,
			passive: true,
		});
		window.addEventListener('resize', align);

		return () => {
			ro.disconnect();
			window.removeEventListener('scroll', align, { capture: true });
			window.removeEventListener('resize', align);
			live.style.visibility = '';
			node.remove();
			bar.remove();
			setHost(null);
			setBarHost(null);
		};
	}, [selected.el]);

	// Gutenberg's useScrollSelectionIntoView + browser focus-scroll yank
	// the page when a near-top block gets focus; no-op the scroll APIs
	// for the mount window so reverting after the fact doesn't stutter.
	useEffect(() => {
		if (!host) return;
		const origScrollIntoView = Element.prototype.scrollIntoView;
		const origWindowScrollTo = window.scrollTo.bind(window);
		const origWindowScroll = window.scroll.bind(window);
		Element.prototype.scrollIntoView = () => {};
		window.scrollTo = () => {};
		window.scroll = () => {};
		const t = setTimeout(() => {
			Element.prototype.scrollIntoView = origScrollIntoView;
			window.scrollTo = origWindowScrollTo;
			window.scroll = origWindowScroll;
		}, 800);
		return () => {
			clearTimeout(t);
			Element.prototype.scrollIntoView = origScrollIntoView;
			window.scrollTo = origWindowScrollTo;
			window.scroll = origWindowScroll;
		};
	}, [host]);

	// Defer the live→canvas swap until BlockEditor's editable shows text
	// that matches the live block. Two distinct flashes converge here:
	// (1) the editable is empty for ~1-2 frames after BlockEditorProvider
	// mounts, and (2) the sub-registry's BlockList paints the prior
	// session's content for several frames before use-block-sync's post-
	// commit resetBlocks lands. A fixed RAF delay can't see (2) because the
	// real delay is content-driven, not frame-count-driven. Poll until the
	// editable's textContent matches the live block's, then reveal the
	// host + bar and hide the live element in one tick. The cap (~33
	// frames ≈ 500ms) bounds the wait in case the editable never converges;
	// after the cap, swap anyway. The match folds wptexturize differences
	// (see normalizedTextEquals) — without that, every smart-quote block
	// missed the content match and rode the cap, revealing ~½s late.
	// Gate on `hasBlocks` (boolean) rather than `blocks` so the effect
	// doesn't re-run on every keystroke — that was unhiding the live
	// element between renders and bleeding the pre-edit text through the
	// transparent canvas ("ghost text" while typing).
	const hasBlocks = !!blocks;
	useEffect(() => {
		if (!host || !hasBlocks) return;
		const live = selected.el;
		if (!live?.isConnected) return;
		const liveText = live.textContent ?? '';

		let raf = 0;
		let attempts = 0;
		const swap = () => {
			if (!live.isConnected) return;
			live.style.visibility = 'hidden';
			if (host.isConnected) host.style.visibility = '';
			if (barHost) barHost.style.visibility = '';
			// Copy the live element's computed text-shaping properties onto
			// the canvas's rendered block. BlockEditor cascades its own
			// defaults for letter-spacing / kerning / variant / white-space
			// that can differ from the theme's computed values and shift
			// wrap boundaries (a single-line heading splitting across an
			// extra line in edit mode). The whiteSpace + lineBreak pair is
			// load-bearing because the editor forces `pre-wrap` /
			// `after-white-space` on the editable; those break the same
			// string at different points than the live render's `normal` /
			// `auto`.
			const editable = host.querySelector('.block-editor-rich-text__editable');
			if (editable) {
				const liveStyle = window.getComputedStyle(live);
				for (const prop of [
					'letterSpacing',
					'wordSpacing',
					'fontKerning',
					'fontFeatureSettings',
					'fontVariant',
					'fontVariantLigatures',
					'fontVariantNumeric',
					'fontStretch',
					'textRendering',
					'whiteSpace',
					'lineBreak',
				]) {
					editable.style[prop] = liveStyle[prop];
				}
			}
		};
		const poll = () => {
			const editable = host.querySelector('.block-editor-rich-text__editable');
			// Reveal once the editable's text catches up to the live block's.
			// normalizedTextEquals folds wptexturize (curly vs straight quote)
			// so a smart-punctuation block isn't held unequal until the cap;
			// two empty texts compare equal (an empty block being edited).
			// Cap at ~500ms in case it never converges (e.g. font ligatures).
			const matched =
				editable && normalizedTextEquals(editable.textContent, liveText);
			if (matched || ++attempts > 33) {
				swap();
				return;
			}
			raf = requestAnimationFrame(poll);
		};
		raf = requestAnimationFrame(poll);
		return () => {
			if (raf) cancelAnimationFrame(raf);
			if (live.isConnected) live.style.visibility = '';
		};
	}, [host, hasBlocks, selected.el, barHost]);

	// Capture phase beats the agent's Escape handler, which would close the chat.
	useEffect(() => {
		const onKey = (e) => {
			if (e.key === 'Escape') {
				e.preventDefault();
				e.stopPropagation();
				clearSelected();
				return;
			}
			if (e.key !== 'Enter') return;
			if (e.metaKey || e.ctrlKey) {
				// A focused link popover (LinkControl, for both button and
				// phone-paragraph links) holds the typed URL until it commits.
				// Hijacking Cmd+Enter here would save the stale href and drop
				// the edit — let the key reach the popover so it applies first.
				if (e.target?.closest?.('.block-editor-link-control')) return;
				e.preventDefault();
				e.stopPropagation();
				saveRef.current?.();
				return;
			}
			// Plain Enter inside the canvas → soft line break, not a new block.
			// Multi-block saves would need server-side renumbering of TagBlocks
			// IDs after the insert, plus a page reload to pick them up; soft
			// breaks keep blocks.length === 1 and ride the single-block splice
			// path. Shift+Enter is Gutenberg's native soft break — pass through.
			if (e.shiftKey || e.altKey) return;
			if (!host || !host.contains(e.target)) return;
			const editable = e.target.closest?.('[contenteditable="true"]');
			if (!editable || !host.contains(editable)) return;
			const sel = e.target.ownerDocument?.defaultView?.getSelection?.();
			if (!sel || sel.rangeCount === 0) return;
			e.preventDefault();
			e.stopPropagation();
			const range = sel.getRangeAt(0);
			range.deleteContents();
			const br = e.target.ownerDocument.createElement('br');
			// rich-text's createFromElement (create.cjs:323) drops any <br>
			// without `data-rich-text-line-break` from the value it reads
			// back from the editable. Without the attribute, the input-event
			// dispatch below runs createRecord → handleChange and the new
			// record has no line break, so React reverts the DOM. Match the
			// attribute Gutenberg adds for its own Shift+Enter <br>s.
			br.setAttribute('data-rich-text-line-break', 'true');
			range.insertNode(br);
			range.setStartAfter(br);
			range.collapse(true);
			sel.removeAllRanges();
			sel.addRange(range);
			editable.dispatchEvent(
				new InputEvent('input', {
					bubbles: true,
					inputType: 'insertLineBreak',
				}),
			);
		};
		document.addEventListener('keydown', onKey, true);
		return () => document.removeEventListener('keydown', onKey, true);
	}, [clearSelected, host]);

	const handleSave = async () => {
		if (saving) return;
		if (!blocks) {
			clearSelected();
			return;
		}
		// Move focus off the Save button before it disables so focus isn't
		// stranded on a disabled control; the status node then announces
		// "Saving…" politely.
		statusRef.current?.focus({ preventScroll: true });
		setSaving(true);
		setSaveError(null);
		const snap = selected;
		const beforeRawBlock = beforeRawBlockRef.current;
		const fingerprint = textFingerprint(snap.el);
		try {
			const rawBlock = serialize(blocks);
			const res = await save({
				source: snap.source,
				blockId: snap.blockId,
				blockType: snap.blockType,
				rawBlock,
				fingerprint,
			});
			if (!res.rendered) throw new Error('No rendered HTML in response');
			const newEl = splice(snap.el, res.rendered);
			if (!newEl) throw new Error('Splice failed');
			invalidateBlockSource(snap.source, snap.blockId);
			if (beforeRawBlock) {
				pushUndo({
					kind: 'block',
					source: snap.source,
					blockId: snap.blockId,
					blockType: snap.blockType,
					rawBlock: beforeRawBlock,
				});
			}
			track('save', { kind: 'block', blockType: snap.blockType });
			clearSelected();
		} catch (err) {
			track('save_failed', {
				kind: 'block',
				blockType: snap.blockType,
				reason: err?.status || err?.message,
			});
			setSaveError(friendlyMessage(err));
			setSaving(false);
		}
	};

	saveRef.current = handleSave;

	useEffect(() => {
		const proxy = (options) => saveRef.current?.(options);
		registerSaver(proxy);
		return () => unregisterSaver(proxy);
	}, []);

	if (loadError) {
		return <ErrorPill message={loadError} onDismiss={clearSelected} />;
	}
	// Render the canvas as soon as the host exists so the editor outline
	// flows continuously from the hover bar's outline.
	if (!host) return null;

	return (
		<>
			{createPortal(
				<div className="extendify-quick-edit-canvas">
					{blocks ? (
						<BlockEditorProvider
							value={blocks}
							onChange={setBlocks}
							onInput={setBlocks}
							settings={{
								hasFixedToolbar: true,
								__experimentalSetIsInserterOpened: () => {},
								// Sub-registry doesn't inherit the global LinkControl backend.
								__experimentalFetchLinkSuggestions: fetchLinkSuggestions,
							}}
						>
							<AutoSelectFirstBlock />
							{barHost
								? createPortal(
										<div
											data-test="quick-edit-floating-bar-inner"
											className="extendify-quick-edit-floating-bar-inner inline-flex w-max flex-nowrap items-center gap-[4px] whitespace-nowrap rounded-[8px] bg-white p-[6px] font-qe shadow-[0_8px_24px_-6px_rgba(15,23,42,0.25),0_0_0_1px_rgba(15,23,42,0.06)]"
										>
											{selected.blockType === 'core/heading' ? (
												<div className="relative inline-flex items-center">
													<HeadingLevelButton />
												</div>
											) : null}
											<TextAlignButtons />
											{BlockToolbar ? <BlockToolbar hideDragHandle /> : null}
											{/* `core/button` is controlled by global styles, not inline text
											    color — color buttons render only for rich-text blocks. */}
											{selected.blockType === 'core/paragraph' ||
											selected.blockType === 'core/heading' ? (
												<div
													data-test="quick-edit-colors-group"
													className="relative inline-flex items-center gap-[4px] pl-[12px] ml-[4px] before:content-[''] before:absolute before:left-0 before:top-1/2 before:h-[14px] before:w-px before:-translate-y-1/2 before:bg-gray-300"
												>
													<ColorButton
														kind="text"
														label={__('Text color', 'extendify-local')}
														iconClassName="before:content-['A'] after:content-[''] after:absolute after:bottom-[1px] after:left-[2px] after:right-[2px] after:h-[2px] after:rounded-[1px] after:bg-[var(--wp--preset--color--primary,#3b82f6)]"
													/>
													<ColorButton
														kind="highlight"
														label={__('Highlight color', 'extendify-local')}
														iconClassName="before:content-['A'] before:rounded-[3px] before:bg-[#fde047] before:px-[4px] before:py-[2px]"
													/>
												</div>
											) : null}
											<div className="relative inline-flex flex-nowrap items-center gap-[4px] whitespace-nowrap ml-[8px] pl-[12px] before:content-[''] before:absolute before:left-0 before:top-1/2 before:h-[14px] before:w-px before:-translate-y-1/2 before:bg-gray-300">
												{aiAvailable ? (
													<button
														type="button"
														data-test="quick-edit-ask-ai"
														className="inline-flex h-[28px] cursor-pointer items-center justify-center gap-[6px] rounded-[6px] border-0 px-[12px] py-0 text-[13px] font-medium leading-[1.4] text-white transition-[background] duration-[120ms] bg-[#3858e9] hover:bg-[#2145e6] disabled:cursor-not-allowed disabled:opacity-60"
														onClick={handleAskAiClick}
														disabled={saving}
													>
														<span aria-hidden="true">✦</span>
														{__('Ask AI', 'extendify-local')}
													</button>
												) : null}
												<button
													type="button"
													data-test="quick-edit-cancel"
													className="inline-flex h-[28px] cursor-pointer items-center justify-center rounded-[6px] border-0 px-[12px] py-0 text-[13px] font-medium leading-[1.4] bg-gray-200 text-gray-900 transition-[background] duration-[120ms] disabled:cursor-not-allowed disabled:opacity-50"
													onClick={clearSelected}
													disabled={saving}
												>
													{__('Cancel', 'extendify-local')}
												</button>
												<button
													type="button"
													data-test="quick-edit-save"
													className="inline-flex h-[28px] cursor-pointer items-center justify-center rounded-[6px] border-0 px-[12px] py-0 text-[13px] font-medium leading-[1.4] bg-gray-900 text-white transition-[background] duration-[120ms] hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
													onClick={handleSave}
													disabled={saving}
												>
													{saving
														? __('Saving…', 'extendify-local')
														: __('Save', 'extendify-local')}
												</button>
												{/* biome-ignore lint/a11y/useSemanticElements: deliberate live region; <output> changes display + semantics */}
												<div
													ref={statusRef}
													role="status"
													aria-live="polite"
													tabIndex={-1}
													className="extendify-quick-edit-floating-status sr-only"
												>
													{saving ? __('Saving…', 'extendify-local') : ''}
												</div>
											</div>
										</div>,
										barHost,
									)
								: null}
							<BlockTools>
								<WritingFlow>
									<ObserveTyping>
										<BlockList />
									</ObserveTyping>
								</WritingFlow>
							</BlockTools>
							{/* Inline rich-text popovers (the LinkControl URL editor)
							    resolve to the `__unstable-block-tools-after` slot, which
							    BlockTools renders inside this canvas. When the edited
							    block sits in a sticky header — a containing block with
							    overflow:hidden — the position:fixed popover is clipped to
							    a sliver (floating-ui's size middleware measures the tiny
							    header interior). Rendering the slot at document.body, last
							    so it wins the name in the shared SlotFillProvider, lifts
							    the popover out of that clip so it measures the viewport. */}
							{/* The wrapper is positioned (quick-edit.css) — without it the
							    popover ignores the admin bar margin and covers its anchor. */}
							{createPortal(
								<div className="extendify-quick-edit-popover-slot">
									<Popover.Slot name="__unstable-block-tools-after" />
								</div>,
								document.body,
							)}
						</BlockEditorProvider>
					) : null}
					{saveError ? (
						<div
							data-test="quick-edit-canvas-error"
							className="mt-[8px] rounded-[6px] bg-red-100 px-[12px] py-[8px] text-[13px] text-red-800"
							role="alert"
						>
							{saveError}
						</div>
					) : null}
				</div>,
				host,
			)}
		</>
	);
};

const ErrorPill = ({ message, onDismiss }) => (
	<div
		role="alert"
		style={{
			position: 'fixed',
			top: 16,
			right: 16,
			zIndex: 99999,
			padding: '8px 12px',
			background: '#fee2e2',
			color: '#991b1b',
			borderRadius: 8,
			fontSize: 13,
			boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
		}}
	>
		{message}
		<button
			type="button"
			aria-label={__('Dismiss', 'extendify-local')}
			onClick={onDismiss}
			style={{
				marginLeft: 8,
				border: 0,
				background: 'transparent',
				cursor: 'pointer',
				fontWeight: 'bold',
			}}
		>
			×
		</button>
	</div>
);
