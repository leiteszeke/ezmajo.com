// Lives outside the .extendify-quick-edit prefix scope; modal styles need
// the /* no-prefix */ marker to match the body-level DOM wp-components portals to.
import { createRoot } from '@wordpress/element';

const ROOT_ID = 'extendify-quick-edit-modal-root';

// Override @wordpress/components Modal's default bodyOpenClassName ("modal-open")
// so our modals don't trip the wp.media-detection rule in quick-edit.css
// (`body.modal-open .components-modal__frame:has(.extendify-quick-edit-modal)`).
// Round-6 keyed that rule off `body.modal-open` thinking it was a wp.media-only
// signal; @wordpress/components Modal also adds it on mount, so every QE modal
// was hiding itself on first open.
export const QE_MODAL_BODY_OPEN_CLASS = 'extendify-quick-edit-modal-open';

let modalRoot = null;
let reactRoot = null;

const ensureNode = () => {
	if (modalRoot?.isConnected) return modalRoot;
	modalRoot = document.createElement('div');
	modalRoot.id = ROOT_ID;
	modalRoot.className = 'extendify-quick-edit';
	document.body.appendChild(modalRoot);
	return modalRoot;
};

export const mountModal = (element) => {
	const node = ensureNode();
	if (!reactRoot) reactRoot = createRoot(node);
	reactRoot.render(element);
};

export const closeModal = (reload) => {
	if (reactRoot) {
		reactRoot.unmount();
		reactRoot = null;
	}
	if (modalRoot) {
		modalRoot.remove();
		modalRoot = null;
	}
	if (reload) window.location.reload();
};
