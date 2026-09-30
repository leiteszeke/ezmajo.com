import {
	ANNOUNCE_STORAGE_KEY,
	getStackDepth,
	performUndo,
} from '../state/undo';

const isInEditable = (el) => {
	let node = el;
	while (node?.nodeType === 1) {
		if (node.isContentEditable) return true;
		const tag = node.tagName;
		// An empty field has no native undo to protect, so it must not swallow
		// the page-level undo — the agent chat box auto-focuses empty on the
		// frontend after a Quick Edit save + reload.
		if (tag === 'INPUT' || tag === 'TEXTAREA') return node.value.trim() !== '';
		if (tag === 'SELECT') return true;
		node = node.parentElement;
	}
	return false;
};

const onKeydown = (e) => {
	if (!(e.metaKey || e.ctrlKey)) return;
	if (e.shiftKey || e.altKey) return;
	if (e.key !== 'z' && e.key !== 'Z') return;
	// Defer to the host's own undo when an inline editor, media frame, or popover is open.
	if (document.querySelector('.extendify-quick-edit-host')) return;
	if (document.querySelector('.media-modal')) return;
	if (
		document.querySelector(
			'.extendify-quick-edit-color-popover, .extendify-quick-edit-image-menu',
		)
	) {
		return;
	}
	if (isInEditable(e.target)) return;
	if (getStackDepth() === 0) return;
	e.preventDefault();
	performUndo();
};

let attached = false;

export const attachKeyboardUndo = () => {
	if (attached) return;
	attached = true;
	document.addEventListener('keydown', onKeydown, true);
};

export const detachKeyboardUndo = () => {
	if (!attached) return;
	attached = false;
	document.removeEventListener('keydown', onKeydown, true);
};

// Announces the previous page's undo result after the reload, so SR users know
// the navigation was their own undo and not a page refresh.
export const announcePostReload = () => {
	let msg = null;
	try {
		msg = window.sessionStorage.getItem(ANNOUNCE_STORAGE_KEY);
		if (msg) window.sessionStorage.removeItem(ANNOUNCE_STORAGE_KEY);
	} catch (_) {
		return;
	}
	if (!msg) return;
	const live = document.createElement('div');
	live.setAttribute('role', 'status');
	live.setAttribute('aria-live', 'polite');
	live.setAttribute('aria-atomic', 'true');
	live.style.cssText =
		'position:absolute;left:-10000px;top:auto;width:1px;height:1px;overflow:hidden;';
	document.body.appendChild(live);
	// Assistive tech ignores aria-live regions that contain text on initial render;
	// mount empty, then set text on the next tick.
	window.setTimeout(() => {
		live.textContent = msg;
	}, 100);
	window.setTimeout(() => live.remove(), 5000);
};
