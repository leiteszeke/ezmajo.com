// The outline's observers miss head-CSS reflows and replaced nodes.
export const refreshBlockHighlight = () =>
	window.dispatchEvent(new Event('extendify-agent:refresh-block-highlight'));
