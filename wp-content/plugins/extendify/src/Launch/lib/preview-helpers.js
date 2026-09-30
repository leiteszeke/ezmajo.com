const FONT_VAR_PREFIX = '--wp--preset--font-family';
const HEADING_FONT_VAR_KEY = '--wp--preset--font-family--heading';
const BODY_FONT_VAR_KEY = '--wp--preset--font-family--body';

// Generates font links and styles from custom variations to override fonts in `theme-processed.json`
export const getFontOverrides = (variation) => {
	let customFontLinks = '';
	let fontOverrides = '';

	if (!variation?.title) {
		return { customFontLinks, fontOverrides };
	}

	// These values look like `var(--wp--preset--font-family--${fontFamilySlug})`
	const headingFontVarValue =
		variation.styles?.elements?.heading?.typography?.fontFamily;
	const bodyFontVarValue = variation.styles?.typography?.fontFamily;
	const customFonts =
		variation.settings?.typography?.fontFamilies?.custom ?? [];

	if (headingFontVarValue) {
		fontOverrides += `:root { ${HEADING_FONT_VAR_KEY}: ${headingFontVarValue}; }`;
		fontOverrides += `h1, h2, h3, h4, h5, h6 { font-family: ${headingFontVarValue} !important; }`;
	}

	if (bodyFontVarValue) {
		fontOverrides += `:root { ${BODY_FONT_VAR_KEY}: ${bodyFontVarValue}; }`;
		fontOverrides += `body { font-family: ${bodyFontVarValue} !important; }`;
	}

	for (const font of customFonts) {
		const customFontLink = `<link id="ext-custom-font-${font.slug}" rel="stylesheet" href="${font.css}">`;
		if (!customFontLinks.includes(customFontLink)) {
			customFontLinks += customFontLink;
		}

		const fontOverride = `:root { ${FONT_VAR_PREFIX}--${font.slug}: "${font.fontFamily}"; }`;
		if (!fontOverrides.includes(fontOverride)) {
			fontOverrides += fontOverride;
		}
	}

	return { customFontLinks, fontOverrides };
};
