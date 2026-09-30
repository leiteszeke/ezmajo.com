import { createBlock, parse, serialize } from '@wordpress/blocks';

// core/media-text keys its image off media* attributes; url/id do nothing there.
const IMAGE_ATTRIBUTES = {
	'core/image': { url: 'url', id: 'id', alt: 'alt' },
	'core/cover': { url: 'url', id: 'id', alt: 'alt' },
	'core/media-text': {
		url: 'mediaUrl',
		id: 'mediaId',
		alt: 'mediaAlt',
		// A video side would keep rendering as one.
		set: { mediaType: 'image' },
		// mediaSizeSlug names a size of the attachment being replaced.
		clear: ['mediaSizeSlug'],
	},
};

// Swapping an un-fetched url into the live img flashes broken while it loads.
export const preloadImage = (src) =>
	new Promise((resolve, reject) => {
		const img = new Image();
		img.onload = () => resolve(src);
		img.onerror = reject;
		img.src = src;
	});

// The block's own save() regenerates the markup (img src, wp-image-{id}) from
// the attributes, so nothing here touches the HTML.
export const swapBlockImage = (serializedBlock, image) => {
	const url = image?.source_url || image?.url;
	if (!url || !image?.id) return null;
	// The attachment's alt carries the AI-generated disclosure prefix.
	const alt = image.alt_text ?? '';
	const parsed = parse(serializedBlock);
	if (!parsed.some((block) => IMAGE_ATTRIBUTES[block.name])) return null;
	const blocks = parsed.map((block) => {
		const slots = IMAGE_ATTRIBUTES[block.name];
		if (!slots) return block;
		const attributes = {
			...block.attributes,
			[slots.url]: url,
			[slots.id]: image.id,
			...slots.set,
		};
		if (alt) attributes[slots.alt] = alt;
		else delete attributes[slots.alt];
		for (const name of slots.clear ?? []) delete attributes[name];
		// Remove the import class to stop the unsplash cron from seeing it
		const className = (attributes.className ?? '')
			.split(/\s+/)
			.filter((cls) => cls && cls !== 'extendify-image-import')
			.join(' ');
		if (className) attributes.className = className;
		else delete attributes.className;
		// serialize() echoes a drifted block's original source, dropping the swap —
		// rebuild it (the editor's own recovery) so the new image reaches the markup.
		return block.isValid === false
			? createBlock(block.name, attributes, block.innerBlocks)
			: { ...block, attributes };
	});
	return serialize(blocks);
};
