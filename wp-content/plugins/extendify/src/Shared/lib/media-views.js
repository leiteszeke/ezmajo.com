const CUSTOM_CSS_ELEMENT_ID = 'media-views-important';

const processRules = (rules) => {
	const result = [];

	[...rules].forEach((rule) => {
		switch (rule.type) {
			case CSSRule.STYLE_RULE:
				result.push(addImportant(rule));
				break;
			case CSSRule.MEDIA_RULE:
				result.push(`@media ${rule.conditionText} {`);
				processRules(rule.cssRules, result);
				result.push('}');
				break;
			default:
				result.push(rule.cssText);
				break;
		}
	});

	return result;
};

const addImportant = (rule) => {
	const declarations = [...rule.style].map(
		(prop) => `${prop}: ${rule.style.getPropertyValue(prop)} !important`,
	);

	return `${rule.selectorText} { ${declarations.join('; ')}; }`;
};

// A <style> tag resolves core's relative url() against the page, so they 404.
const rebaseUrls = (css, base) =>
	css.replace(/url\((["']?)([^"')]+)\1\)/g, (match, _quote, url) => {
		try {
			return `url("${new URL(url, base).href}")`;
		} catch {
			return match;
		}
	});

const getCustomMediaViewsCss = () => {
	const link = document.getElementById('media-views-css');
	if (!link) return null;

	const processedRules = processRules(link.sheet?.cssRules);

	if (!processedRules?.length) return null;

	const css = rebaseUrls(processedRules.join('\n'), link.href);

	const additionalCSS = `
			div:has(> .media-modal) {z-index: 999999 !important}

			/* A host page's <meta name="color-scheme"> otherwise dark-renders wp.media's inputs and scrollbars. */
			.media-modal,
			.media-modal-backdrop {
				color-scheme: only light !important;
			}

			.media-frame {
				h1, h2, h3, h4, h5, h6 {
					font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif !important;
					color: #1d2327 !important;
				}

				.uploader-inline-content {
					color: #1d2327 !important;
				}

				.media-sidebar {
					color: #646970 !important;
				}

				/* Core leaves these uncolored, so they take the theme's foreground. */
				.media-search-input-label,
				.load-more-count,
				label[for="media-attachment-filters"],
				label[for="media-attachment-date-filters"] {
					color: #3c434a !important;
				}
			}
		`;

	return `${additionalCSS} ${css}`;
};

export const addCustomMediaViewsCss = () => {
	if (document.getElementById(CUSTOM_CSS_ELEMENT_ID)) return;

	const css = getCustomMediaViewsCss();

	if (!css) return;

	const style = document.createElement('style');

	style.id = CUSTOM_CSS_ELEMENT_ID;
	style.textContent = css;

	document.head.appendChild(style);
};

export const removeCustomMediaViewsCss = () => {
	const style = document.getElementById(CUSTOM_CSS_ELEMENT_ID);

	if (style) style.remove();
};
