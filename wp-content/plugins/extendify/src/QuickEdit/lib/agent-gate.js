// Mirrors DOMHighlighter's eligibility gates so the Ask AI pill only
// surfaces on blocks the agent's selector tool would have accepted —
// keeps the two selectors in lockstep until DOMHighlighter shrinks to
// a passive renderer.
const IGNORED_CLASS_RX = /^(wp-block-video|wp-block-spacer|wp-block-post-.*)$/;
// Self-rendering blocks: their inner tree is minted at render time (a loop per
// post, a cart drawer), so no id inside them exists in the tree a save walks.
// The server twin is TagTemplateParts::$ignored.
export const DYNAMIC_BLOCK_TYPES = new Set([
	'core/query',
	'core/post-template',
	'core/post-content',
	'core/comments',
	'core/comment-template',
	'woocommerce/product-collection',
	'woocommerce/product-template',
	'woocommerce/mini-cart',
	'woocommerce/cart',
	'woocommerce/checkout',
]);

// Core blocks drop their namespace in the rendered class; the rest keep it.
const classForBlock = (name) =>
	`wp-block-${name.startsWith('core/') ? name.slice(5) : name.replace('/', '-')}`;

const DYNAMIC_BLOCK_SEL = [...DYNAMIC_BLOCK_TYPES]
	.map((name) => `.${classForBlock(name)}`)
	.join(', ');

// Nothing in a loop item has an id, so the walk climbs out and hits the section.
export const escapesDynamicBlock = (fromEl, toEl) => {
	const owner = fromEl?.closest?.(DYNAMIC_BLOCK_SEL);
	return !!owner && !!toEl && !owner.contains(toEl);
};

export const isAgentEligibleForTarget = (target) => {
	const el = target?.el;
	if (!el?.classList) return false;
	if (target?.dynamicInterior) return false;
	if (DYNAMIC_BLOCK_TYPES.has(target?.blockType)) return false;
	for (const cls of el.classList) {
		if (IGNORED_CLASS_RX.test(cls)) return false;
	}
	return true;
};
