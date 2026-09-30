// Both Woo product loops, block and classic [products], mark tiles this way.
const TILE = 'li.product[class*="post-"]';
const TITLE = '.wp-block-post-title, .woocommerce-loop-product__title';
const MAX_PRODUCTS = 50;

const productId = (tile) => Number(tile.className.match(/\bpost-(\d+)\b/)?.[1]);

const productTitle = (tile) =>
	(tile.querySelector(TITLE) ?? tile.querySelector('a'))?.textContent?.trim() ??
	'';

const readPageProducts = () => {
	const byId = new Map();
	for (const tile of document.querySelectorAll(TILE)) {
		const id = productId(tile);
		if (!id || byId.has(id)) continue;
		const title = productTitle(tile);
		// The model matches on the title, so an untitled id is unusable.
		if (!title) continue;
		byId.set(id, { id, title });
	}
	return [...byId.values()].slice(0, MAX_PRODUCTS);
};

export default {
	id: 'wp-ability:woocommerce',
	onStarted: () => {
		const products = readPageProducts();
		// An earlier run's list must not outlive the grid it was read from.
		if (!products.length) {
			delete window.extAgentData.agentContext.pageProducts;
			return;
		}
		window.extAgentData.agentContext.pageProducts = products;
	},
};
