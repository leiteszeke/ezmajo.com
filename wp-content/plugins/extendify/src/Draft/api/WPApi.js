import { createBlock, insertBlock } from '@wordpress/blocks';

export const addImageToBlock = (
	selectedBlock,
	image,
	updateBlockAttributes,
) => {
	if (selectedBlock.name === 'core/image') {
		updateBlockAttributes(selectedBlock.clientId, {
			id: image.id,
			caption: image.caption.raw,
			url: image.source_url,
			alt: image.alt_text,
		});
	}

	if (selectedBlock.name === 'core/media-text') {
		updateBlockAttributes(selectedBlock.clientId, {
			mediaId: image.id,
			caption: image.caption.raw,
			mediaUrl: image.source_url,
			mediaAlt: image.alt_text,
			mediaType: 'image',
		});
	}

	if (selectedBlock.name === 'core/gallery') {
		const newBlock = createBlock('core/image', {
			id: image.id,
			caption: image.caption.raw,
			url: image.source_url,
			alt: image.alt_text,
		});

		insertBlock(newBlock, null, selectedBlock.clientId);
	}

	if (selectedBlock.name === 'core/cover') {
		updateBlockAttributes(selectedBlock.clientId, {
			id: image.id,
			url: image.source_url,
			alt: image.alt_text,
		});
	}
};
