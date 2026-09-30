export const addIdAttributeToBlock = (blockCode, id) =>
	blockCode.replace(
		/(<div\s[^>]*class="[^"]*\bwp-block-group\b[^"]*")/,
		`$1 id="${id}"`,
	);
