import { flushChatStorage } from '@agent/state/chat';
import { useStatusStore } from '@agent/state/status';

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Components navigate through this so the pending chat save always lands first.
export const doReload = async (url) => {
	const flush = flushChatStorage();
	// Quick saves skip the overlay; once shown it holds 1s so it never flashes.
	const saveIsSlow = await Promise.race([
		flush.then(() => false),
		wait(2000).then(() => true),
	]);
	if (saveIsSlow) {
		useStatusStore.getState().setLeavingPage(true);
		await Promise.all([flush, wait(1000)]);
	}
	if (url) return window.location.assign(url);
	window.location.reload();
};
