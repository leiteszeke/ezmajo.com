import { createRoot, render as renderDeprecated } from '@wordpress/element';

export const render = (component, node) => {
	if (typeof createRoot !== 'function') {
		renderDeprecated(component, node);
		return;
	}
	createRoot(node).render(component);
};
