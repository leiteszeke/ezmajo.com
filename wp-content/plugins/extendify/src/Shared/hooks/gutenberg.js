import { store as blockEditorStore } from '@wordpress/block-editor';
import { subscribe, useSelect } from '@wordpress/data';
import { store as editorStore } from '@wordpress/editor';
import { useEffect, useState } from '@wordpress/element';

//** This hook checks if the editor is interactive yet */
export const useEditorReady = () => {
	const [isEditorReady, setIsEditorReady] = useState(false);
	const blocksReady = useSelect(
		(select) =>
			select(blockEditorStore).__unstableIsEditorReady ||
			select(blockEditorStore).getBlockCount() > 0 ||
			select(blockEditorStore).getSelectedBlockClientId(),
	);
	const editorReady = useSelect(
		(select) =>
			select(editorStore).__unstableIsEditorReady ||
			select(editorStore).isCleanNewPost(),
	);
	// TODO: do we need to wait on the iframe?

	useEffect(() => {
		const unsubscribe = subscribe(() => {
			if (blocksReady || editorReady) {
				setIsEditorReady(true);
				unsubscribe();
			}
		});
	}, [blocksReady, editorReady]);

	return isEditorReady;
};
