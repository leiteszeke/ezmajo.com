import { isEmbedded } from '@shared/lib/embedded-guard';
import { dispatch } from '@wordpress/data';
import domReady from '@wordpress/dom-ready';
import { createRoot, render } from '@wordpress/element';
import { InlineEditor } from './components/InlineEditor';
import { bindAdminBarToggle } from './lib/admin-bar';
import { wireGlobalEscape } from './lib/global-escape';
import {
	attach as attachHoverBar,
	detach as detachHoverBar,
} from './lib/hover-bar';
import { attachKeyboardEntry, detachKeyboardEntry } from './lib/keyboard-entry';
import {
	announcePostReload,
	attachKeyboardUndo,
	detachKeyboardUndo,
} from './lib/keyboard-undo';
import { fetchLinkSuggestions } from './lib/link-suggestions';
// Side-effect import: subscribes html.extendify-quick-edit-on before first paint.
import { STORAGE_KEY, useEditModeStore } from './state/edit-mode';
import { useQuickEditStore } from './state/store';

import './quick-edit.css';

// Cross-bundle race: edit-mode.js is shared with the Agent bundle (via
// Chat.jsx and the QuickEdit store). When the Agent bundle's script tag fires
// first, the shared chunk evaluates before this bundle's inline
// `window.extQuickEditData = …` has run, so DEFAULT_ON resolves to
// false and the store freezes with on=false. By the time THIS module
// loads, our `'before'` inline has fired, so re-seed if the server says
// defaultOn AND the user has no persisted choice to honor.
(() => {
	if (isEmbedded()) return;
	if (!window.extQuickEditData?.defaultOn) return;
	let persisted;
	try {
		persisted = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
	} catch {
		persisted = null;
	}
	if (persisted) return;
	useEditModeStore.getState().setOn(true);
})();

const App = () => <InlineEditor />;

const mount = () => {
	if (!window.extQuickEditData) return;
	// Never run framed — Customizer preview, multilingual editors, page-builder
	// previews are all front-end renders, but QE only belongs on the live page.
	if (isEmbedded()) return;

	const hasTargets =
		document.querySelector(
			'[data-extendify-agent-block-id], [data-extendify-part-block-id]',
		) !== null;
	if (!hasTargets) return;

	// The wrapper class is the postcss-prefix-selector scope key (see
	// `quick-edit` in webpack.config.mjs filePrefixes). Tailwind's preflight +
	// utilities are all scoped to descendants of `div.extendify-quick-edit`.
	const host = document.createElement('div');
	host.id = 'extendify-quick-edit-root';
	host.className = 'extendify-quick-edit';
	document.body.appendChild(host);

	if (typeof createRoot === 'function') {
		createRoot(host).render(<App />);
	} else {
		render(<App />, host);
	}

	bindAdminBarToggle();

	// LinkControl outside our BlockEditorProvider (e.g. NavItemModal in a Modal
	// portal) needs the global core/block-editor settings hooked too.
	dispatch('core/block-editor')?.updateSettings({
		__experimentalFetchLinkSuggestions: fetchLinkSuggestions,
	});

	// Don't pay the hover/keyboard listener cost when edit mode is off.
	const getSession = () => !!useQuickEditStore.getState().selected;
	const apply = (on) => {
		if (on) {
			attachHoverBar();
			attachKeyboardEntry({ getSession });
			attachKeyboardUndo();
		} else {
			detachKeyboardUndo();
			detachKeyboardEntry();
			detachHoverBar();
		}
	};
	apply(useEditModeStore.getState().on);
	useEditModeStore.subscribe((state) => apply(state.on));

	wireGlobalEscape();

	announcePostReload();

	// Toolbar bundle (#3334) dispatches this event so it doesn't need to import our store.
	window.addEventListener('extendify-quick-edit:toggle', () => {
		useEditModeStore.getState().toggle();
	});
};

domReady(mount);
