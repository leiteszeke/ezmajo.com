// The clicked block's render-time identity, sent with every save so the server
// can refuse (409) when its parse-time block count resolves to a different
// block of the same type — synced patterns, nested navs, and dynamic expansion
// all desync the two counts past the type guard.
//
// Read from the LIVE element the user clicked, never the cached block source:
// that source is resolved by the same count as the save, so it would echo a
// misresolve and the check would pass on the wrong block.

// The client reads the block's text from the rendered DOM, where the_content
// has run wptexturize (straight quotes → curly, -- → dash, ... → ellipsis);
// the server fingerprints the raw stored markup. Fold those substitutions back
// to ASCII so an apostrophe alone ("Woody's" vs "Woody’s") can't false a 409.
// `\s` already covers non-breaking/unicode spaces in JS. Must stay in lockstep
// with BlockFingerprint::normalize on the PHP side.
export const normalizeText = (value) =>
	String(value ?? '')
		.replace(/[‘’‚‛]/g, "'")
		.replace(/[“”„‟]/g, '"')
		.replace(/[‒–—―]/g, '-')
		.replace(/-{2,}/g, '-')
		.replace(/…/g, '...')
		.replace(/\s+/g, ' ')
		.trim();

// The live→canvas swap-reveal poll compares the canvas editable's text against
// the live block's rendered text to know when the editor has caught up. The
// live text is wptexturize'd (curly) and the editable is raw (straight), so
// both sides must fold through normalizeText — a whitespace-only compare leaves
// a smart-quote block forever unequal, stranding the reveal on its frame-cap.
export const normalizedTextEquals = (a, b) =>
	normalizeText(a) === normalizeText(b);

// Omitted (null) when the element has no visible text, so blocks like images
// fail open instead of 409-ing on an empty match.
export const textFingerprint = (el) => {
	const text = normalizeText(el?.textContent);
	return text ? { text } : null;
};
