import { flushChatStorage } from '@agent/state/chat';
import { useStatusStore } from '@agent/state/status';

// Components navigate through this so the pending chat save always lands first.
export const doReload = async (url) => {
	const flush = flushChatStorage();
	// Set before the success message paints; the reloaded page opens on this rail.
	document.documentElement.classList.add('extendify-agent-reloading');
	useStatusStore.getState().setLeavingPage(true);
	await flush;
	if (url) return window.location.assign(url);
	window.location.reload();
};
