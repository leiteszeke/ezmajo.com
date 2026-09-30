import { select, subscribe } from '@wordpress/data';
export const whenEditorIsReady = () => {
	return new Promise((resolve) => {
		const unsubscribe = subscribe(() => {
			// This will trigger after the initial render blocking, before the window load event
			// This seems currently more reliable than using __unstableIsEditorReady
			if (
				select('core/editor').isCleanNewPost() ||
				select('core/block-editor').getBlockCount() > 0
			) {
				unsubscribe();
				resolve();
			}
		});
	});
};
