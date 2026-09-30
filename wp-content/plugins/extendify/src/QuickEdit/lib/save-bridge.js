// Lets hover-bar's click rule (plain DOM, not React) trigger the QE canvas's
// save, so a click outside an open canvas doesn't silently discard the user's
// in-flight edits.
//
// BlockTextEditor registers its `handleSave` on mount. The bridge stays a
// no-op when nothing is registered (no QE canvas open) so callers can
// fire-and-forget.

let saver = null;

export const registerSaver = (fn) => {
	saver = fn;
};

export const unregisterSaver = (fn) => {
	if (saver === fn) saver = null;
};

export const hasSaver = () => !!saver;

export const saveSelected = () => {
	if (!saver) return Promise.resolve();
	return Promise.resolve(saver());
};
