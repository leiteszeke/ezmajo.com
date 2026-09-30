// Extendify's front-end surfaces (Quick Edit, the Agent, the simple toolbar)
// must never activate inside another tool's iframe. The Customizer preview,
// multilingual editors, and page-builder previews are all front-end renders,
// so the bundles enqueue and would otherwise mount — but Extendify only
// belongs on the live, top-level page. The live front end is always
// top-level, so a single `self !== top` check rules out every framed
// context, present and future.
export const isEmbedded = (win = window) => {
	try {
		return win.self !== win.top;
	} catch {
		// A cross-origin parent throws on `.top` access; that, too, is framed.
		return true;
	}
};
