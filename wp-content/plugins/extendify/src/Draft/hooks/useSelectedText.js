import { store as blockEditorStore } from '@wordpress/block-editor';
import { useSelect } from '@wordpress/data';
import { useCallback } from '@wordpress/element';

const htmlToText = (html) => {
	try {
		const parser = new DOMParser();
		const doc = parser.parseFromString(html, 'text/html');
		return doc.body.textContent || '';
	} catch (_error) {
		return '';
	}
};

export const useSelectedText = () => {
	const { getSelectedBlockClientIds, getBlocksByClientId } = useSelect(
		(select) => select(blockEditorStore),
		[],
	);

	const selectedBlockId = getSelectedBlockClientIds();

	const getSelectedContent = useCallback(() => {
		const selectedBlocks = getBlocksByClientId(selectedBlockId);
		if (!selectedBlocks?.length) return '';
		const raw = selectedBlocks
			.filter(Boolean)
			.map(({ attributes }) => attributes?.content ?? '')
			.join('\n\n');
		return htmlToText(raw);
	}, [getBlocksByClientId, selectedBlockId]);

	return { selectedText: getSelectedContent().trim() };
};
