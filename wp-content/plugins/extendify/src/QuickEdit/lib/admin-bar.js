import { useEditModeStore } from '../state/edit-mode';

const NODE_ID = '#wp-admin-bar-extendify-quick-edit-toggle';
const AGENT_BTN_ID = 'wp-admin-bar-extendify-agent-btn';
const BOUND_MARK = '__extendifyQuickEditBound';

// The PHP-registered toggle belongs next to the agent button — a JS-injected
// <li> that may land after this bundle, so watch the bar until it shows up.
const positionToggle = (node) => {
	const agentBtn = document.getElementById(AGENT_BTN_ID);
	if (agentBtn) {
		agentBtn.after(node);
		return true;
	}
	document.getElementById('wp-admin-bar-root-default')?.prepend(node);
	return false;
};

const followAgentButton = (node) => {
	if (positionToggle(node)) return;
	const bar = document.getElementById('wpadminbar');
	if (!bar) return;
	const observer = new MutationObserver(() => {
		if (!document.getElementById(AGENT_BTN_ID)) return;
		positionToggle(node);
		observer.disconnect();
	});
	observer.observe(bar, { childList: true, subtree: true });
};

export const bindAdminBarToggle = () => {
	const link = document.querySelector(`${NODE_ID} a`);
	if (!link) return;

	const sync = () => {
		link.setAttribute(
			'aria-checked',
			useEditModeStore.getState().on ? 'true' : 'false',
		);
	};
	sync();

	if (link[BOUND_MARK]) return;
	link[BOUND_MARK] = true;

	followAgentButton(link.closest('li'));

	link.addEventListener('click', (e) => {
		e.preventDefault();
		useEditModeStore.getState().toggle();
	});

	useEditModeStore.subscribe(sync);
};
