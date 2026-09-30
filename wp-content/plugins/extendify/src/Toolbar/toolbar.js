/**
 * Simple toolbar bootstrap.
 *
 * Vanilla JS bound to the bar that `Frontend::render()` writes at
 * `wp_body_open`. Three integrations:
 *
 *   - "AI Agent" button → drives the Extendify Agent's mounted
 *     admin-bar button (the bar is hidden via CSS but stays in the
 *     DOM so the Agent's React code can still target it).
 *   - "Quick Edit" toggle → dispatches a custom event the Quick Edit
 *     bootstrap listens for. Aria-checked mirrors the
 *     `extendify-quick-edit-on` class on `<html>` so the toggle
 *     reflects state changes from any source (admin-bar pill,
 *     chat-input "Select" button, etc.).
 *   - When the Agent sidebar opens, the toolbar slides next to it
 *     so the rounded-frame layout matches what the Agent does to
 *     the core admin bar.
 */
import { isEmbedded } from '@shared/lib/embedded-guard';
import { track } from '@shared/lib/track';
import { __ } from '@wordpress/i18n';
import './toolbar.css';

const QUICK_EDIT_TOGGLE_EVENT = 'extendify-quick-edit:toggle';
const QUICK_EDIT_ON_CLASS = 'extendify-quick-edit-on';
const AGENT_BTN_HOST_ID = 'wp-admin-bar-extendify-agent-btn';
const AGENT_SIDEBAR_ID = 'extendify-agent-sidebar';

function watch(target, options, callback) {
	const observer = new MutationObserver(callback);
	observer.observe(target, options);
	return observer;
}

function findExtendifyAgentButton() {
	const host = document.getElementById(AGENT_BTN_HOST_ID);
	if (!host) return null;
	const mounted = host.querySelector('button:not([disabled])');
	if (mounted) return mounted;
	// The stand-in never leaves the slot, so a disabled button means not-yet-mounted.
	if (host.querySelector('button')) return null;
	return host;
}

function clickExtendifyAgent() {
	const btn = findExtendifyAgentButton();
	if (btn) {
		btn.click();
		return true;
	}
	return false;
}

function waitFor(predicate, maxTries, intervalMs) {
	return new Promise((resolve, reject) => {
		let tries = 0;
		const tick = () => {
			if (predicate()) return resolve();
			if (++tries >= maxTries) return reject();
			setTimeout(tick, intervalMs);
		};
		tick();
	});
}

/**
 * When the Agent sidebar opens we want the toolbar to slide next
 * to it (matches how the Agent reframes the core admin bar). We
 * watch the sidebar's `inert` attribute rather than subscribing to
 * the Zustand store so we don't have to share a chunk with the
 * agent bundle.
 */
function watchAgentSidebar(toolbar, aiBtn) {
	const setOpen = (open) => {
		toolbar.classList.toggle('ext-tb-agent-open', open);
		if (!aiBtn) return;
		aiBtn.inert = open;
		if (open) {
			aiBtn.setAttribute('tabindex', '-1');
			aiBtn.setAttribute('aria-hidden', 'true');
		} else {
			aiBtn.removeAttribute('tabindex');
			aiBtn.removeAttribute('aria-hidden');
		}
	};
	// A resize past the mobile breakpoint replaces this node, so never latch on one.
	let watched = null;
	let inertObserver = null;
	const observer = watch(
		document.body,
		{ childList: true, subtree: true },
		() => {
			const sidebar = document.getElementById(AGENT_SIDEBAR_ID);
			if (sidebar === watched) return;
			watched = sidebar;
			inertObserver?.disconnect();
			inertObserver = null;
			if (!sidebar) {
				setOpen(false);
				return;
			}
			const update = () => setOpen(!sidebar.hasAttribute('inert'));
			inertObserver = watch(
				sidebar,
				{ attributes: true, attributeFilter: ['inert'] },
				update,
			);
			update();
		},
	);
	if (document.getElementById(AGENT_SIDEBAR_ID)) observer.takeRecords();
}

/**
 * Mirror Quick Edit's `extendify-quick-edit-on` html-class onto
 * `aria-checked` so the visual toggle reflects state changes from
 * any source (admin-bar pill, chat input Select button, …).
 */
function watchQuickEditState(btn) {
	const sync = () => {
		const on = document.documentElement.classList.contains(QUICK_EDIT_ON_CLASS);
		btn.setAttribute('aria-checked', on ? 'true' : 'false');
	};
	sync();
	watch(
		document.documentElement,
		{ attributes: true, attributeFilter: ['class'] },
		sync,
	);
}

function init() {
	// Don't wire the toolbar inside another tool's iframe (Customizer preview,
	// page-builder previews). The server skips rendering it there too.
	if (isEmbedded()) return;
	const toolbar = document.getElementById('extendify-toolbar');
	if (!toolbar) return;

	const aiBtn = document.getElementById('ext-tb-ai-agent');
	const quickBtn = document.getElementById('ext-tb-quick-edit');

	if (aiBtn) {
		aiBtn.disabled = true;
		aiBtn.title = __('Loading…', 'extendify-local');
		aiBtn.setAttribute('aria-busy', 'true');
		waitFor(findExtendifyAgentButton, 100, 50).then(
			() => {
				aiBtn.disabled = false;
				aiBtn.removeAttribute('title');
				aiBtn.setAttribute('aria-busy', 'false');
			},
			() => {
				aiBtn.title = __('AI Agent unavailable', 'extendify-local');
				aiBtn.setAttribute('aria-busy', 'false');
			},
		);
		aiBtn.addEventListener('click', (e) => {
			e.preventDefault();
			if (!clickExtendifyAgent()) {
				waitFor(findExtendifyAgentButton, 20, 50).then(clickExtendifyAgent);
			}
		});
	}

	if (quickBtn) {
		watchQuickEditState(quickBtn);
		quickBtn.addEventListener('click', (e) => {
			e.preventDefault();
			window.dispatchEvent(new CustomEvent(QUICK_EDIT_TOGGLE_EVENT));
		});
	}

	toolbar
		.querySelector('.ext-tb-edit')
		?.addEventListener('click', () =>
			track('toolbar_link_clicked', { target: 'block_editor' }),
		);
	toolbar
		.querySelector('.ext-tb-admin-link')
		?.addEventListener('click', () =>
			track('toolbar_link_clicked', { target: 'wp_admin' }),
		);

	watchAgentSidebar(toolbar, aiBtn);
}

if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', init);
} else {
	init();
}
