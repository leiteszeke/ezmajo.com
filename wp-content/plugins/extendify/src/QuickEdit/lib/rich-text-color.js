// Text-color and highlight share core/text-color; we read the active format
// before writing so changing one doesn't clobber the other.
import { select as dataSelect } from '@wordpress/data';
import {
	applyFormat,
	create,
	removeFormat,
	toHTMLString,
} from '@wordpress/rich-text';

export const RICHTEXT_ATTR_BY_BLOCK = {
	'core/paragraph': 'content',
	'core/heading': 'content',
	'core/verse': 'content',
	'core/button': 'text',
	'core/pullquote': 'value',
	'core/code': 'content',
	'core/preformatted': 'content',
};

function parseInlineStyle(str) {
	const out = {};
	(str || '').split(';').forEach((pair) => {
		const i = pair.indexOf(':');
		if (i > 0) {
			const k = pair.slice(0, i).trim().toLowerCase();
			const v = pair.slice(i + 1).trim();
			if (k && v) out[k] = v;
		}
	});
	return out;
}

// Canonical key order so the saved markup is consistent regardless of which
// color (text vs highlight) the user picked first.
const STYLE_KEY_ORDER = ['color', 'background-color'];

function serializeInlineStyle(obj) {
	const ordered = [
		...STYLE_KEY_ORDER.filter((k) => k in obj),
		...Object.keys(obj).filter((k) => !STYLE_KEY_ORDER.includes(k)),
	];
	return ordered.map((k) => `${k}:${obj[k]}`).join(';');
}

// Read the existing core/text-color inline-style property at one position.
// Returns undefined when there's no core/text-color format at that position
// or when the format carries no value for the requested prop.
function readColorPropAt(value, i, prop) {
	const list = value?.formats?.[i];
	const fmt = list?.find((f) => f.type === 'core/text-color');
	if (!fmt) return undefined;
	return parseInlineStyle(fmt.attributes?.style || '')[prop];
}

// Split [start, end) into runs where the OTHER property's existing value
// stays uniform. The caller writes one core/text-color format per run with
// (newProp=newColor, otherProp=runValue), so picking text color on a range
// that already has a sub-range bg preserves that bg only on its sub-range
// — and vice versa. Returns `[{ from, to, otherValue }]`.
function segmentByOtherProp(value, start, end, otherProp) {
	const runs = [];
	if (start >= end) return runs;
	let runStart = start;
	let runValue = readColorPropAt(value, start, otherProp);
	for (let i = start + 1; i < end; i++) {
		const v = readColorPropAt(value, i, otherProp);
		if (v !== runValue) {
			runs.push({ from: runStart, to: i, otherValue: runValue });
			runStart = i;
			runValue = v;
		}
	}
	runs.push({ from: runStart, to: end, otherValue: runValue });
	return runs;
}

// Snapshot the DOM selection so it can be restored after the popover steals focus.
export function captureDomRichTextSelection() {
	const ds = window.getSelection?.();
	if (!ds || !ds.rangeCount) return null;
	const range = ds.getRangeAt(0).cloneRange();
	let anchor = range.startContainer;
	if (anchor && anchor.nodeType !== 1) anchor = anchor.parentElement;
	if (!anchor) return null;
	const rtEl = anchor.closest('[contenteditable="true"]');
	if (!rtEl) return null;
	const blockEl = rtEl.closest('[data-block]');
	if (!blockEl) return null;

	const charOffset = (node, off) => {
		if (node === rtEl) {
			let n = 0;
			for (let i = 0; i < off; i++) {
				const child = rtEl.childNodes[i];
				if (child) n += (child.textContent || '').length;
			}
			return n;
		}
		let total = 0;
		const walker = document.createTreeWalker(rtEl, NodeFilter.SHOW_TEXT);
		let cur = walker.nextNode();
		while (cur) {
			if (cur === node) return total + off;
			total += cur.textContent.length;
			cur = walker.nextNode();
		}
		return total;
	};

	return {
		clientId: blockEl.dataset.block,
		startOffset: charOffset(range.startContainer, range.startOffset),
		endOffset: charOffset(range.endContainer, range.endOffset),
	};
}

function resolveSelectionFromSnap(snap) {
	if (!snap) return null;
	let clientId, attrKey, startOffset, endOffset, block;
	let wholeBlockFallback = false;

	if (
		snap.sel?.start?.attributeKey &&
		snap.sel.end &&
		snap.sel.end.clientId === snap.sel.start.clientId &&
		snap.sel.end.attributeKey === snap.sel.start.attributeKey &&
		snap.sel.start.offset !== snap.sel.end.offset
	) {
		clientId = snap.sel.start.clientId;
		attrKey = snap.sel.start.attributeKey;
		startOffset = Math.min(snap.sel.start.offset, snap.sel.end.offset);
		endOffset = Math.max(snap.sel.start.offset, snap.sel.end.offset);
		block = snap.sel.block;
	} else if (snap.dom && snap.dom.startOffset !== snap.dom.endOffset) {
		clientId = snap.dom.clientId;
		const editorSelect = dataSelect('core/block-editor');
		block = snap.sel?.block || editorSelect?.getBlock(clientId);
		if (!block) return null;
		attrKey = RICHTEXT_ATTR_BY_BLOCK[block.name] || 'content';
		startOffset = Math.min(snap.dom.startOffset, snap.dom.endOffset);
		endOffset = Math.max(snap.dom.startOffset, snap.dom.endOffset);
	} else {
		// No range: fall back to the active block's full RichText so the color
		// buttons still work when the user clicked in without dragging.
		const editorSelect = dataSelect('core/block-editor');
		if (!editorSelect) return null;
		clientId =
			snap.sel?.start?.clientId ||
			snap.dom?.clientId ||
			editorSelect.getSelectedBlockClientId() ||
			(editorSelect.getBlockOrder() || [])[0];
		if (!clientId) return null;
		block = snap.sel?.block || editorSelect.getBlock(clientId);
		if (!block) return null;
		attrKey = RICHTEXT_ATTR_BY_BLOCK[block.name] || 'content';
		startOffset = 0;
		endOffset = -1;
		wholeBlockFallback = true;
	}

	const raw = block.attributes[attrKey];
	let value;
	if (typeof raw === 'string') {
		value = create({ html: raw });
	} else if (raw && typeof raw === 'object' && typeof raw.text === 'string') {
		value = {
			text: raw.text,
			formats: Array.isArray(raw.formats) ? raw.formats.slice() : [],
			replacements: Array.isArray(raw.replacements)
				? raw.replacements.slice()
				: [],
		};
	} else {
		return null;
	}

	const textLen = (value.text || '').length;
	if (wholeBlockFallback) {
		startOffset = 0;
		endOffset = textLen;
	} else {
		startOffset = Math.max(0, Math.min(startOffset, textLen));
		endOffset = Math.max(0, Math.min(endOffset, textLen));
	}
	if (startOffset === endOffset) return null;

	return { clientId, attrKey, startOffset, endOffset, block, value };
}

// `dispatch` MUST come from the inline editor's React-context registry —
// BlockEditorProvider creates a sub-registry that the outer wp.data doesn't see.
export function applyColorFormat(snap, kind, color, dispatch) {
	const sel = resolveSelectionFromSnap(snap);
	if (!sel) return;
	const { clientId, attrKey, startOffset, endOffset, value } = sel;

	const targetProp = kind === 'text' ? 'color' : 'background-color';
	const otherProp = kind === 'text' ? 'background-color' : 'color';

	// Per-segment write: walk the range in runs where the OTHER property
	// is uniform, emit one core/text-color format per run carrying
	// (target=color, other=runValue). The pick the user explicitly made
	// is uniform across the selection by design; the property they DIDN'T
	// touch is preserved per-position so a pre-existing sub-range value
	// (e.g. bg=red on one word) survives unrelated text-color picks.
	const runs = segmentByOtherProp(value, startOffset, endOffset, otherProp);
	let next = removeFormat(value, 'core/text-color', startOffset, endOffset);
	for (const { from, to, otherValue } of runs) {
		const styles = {};
		if (color) styles[targetProp] = color;
		if (otherValue !== undefined) styles[otherProp] = otherValue;

		// `<mark>` (core/text-color's wrapper) has a default yellow
		// background; override it when only the text color is set so the
		// browser-default doesn't bleed through on the live view.
		if (styles.color && !styles['background-color']) {
			styles['background-color'] = 'transparent';
		} else if (!styles.color && styles['background-color'] === 'transparent') {
			delete styles['background-color'];
		}

		const styleStr = serializeInlineStyle(styles);
		if (!styleStr) continue;
		next = applyFormat(
			next,
			{ type: 'core/text-color', attributes: { style: styleStr } },
			from,
			to,
		);
	}

	dispatch.updateBlockAttributes(clientId, {
		[attrKey]: toHTMLString({ value: next }),
	});

	window.requestAnimationFrame(() => {
		dispatch.selectionChange(clientId, attrKey, startOffset, endOffset);
	});
}
