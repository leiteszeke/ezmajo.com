/** Recursively builds a unique duotone to the parent map from the block tree. */
export const getDynamicDuotoneMap = (blocks) => {
	const map = new Map();
	const seen = new Set();
	const duotonePrefix = 'var:preset|duotone|';
	const duotonePrefixLength = duotonePrefix.length;

	const scan = (blocks) => {
		if (!blocks || !blocks.length) return;

		for (const block of blocks) {
			if (block.name !== 'core/image') {
				scan(block.innerBlocks || []);
				continue;
			}

			const url = block.attributes?.url || '';
			if (
				!url ||
				!url.startsWith('data:image/svg+xml;') ||
				seen.has(block.clientId)
			) {
				scan(block.innerBlocks || []);
				continue;
			}

			// slice the duotone value to remove the prefix and get the slug
			const duotoneValue = block.attributes?.style?.color?.duotone;
			const duotone = duotoneValue?.startsWith(duotonePrefix)
				? duotoneValue.slice(duotonePrefixLength)
				: null;

			const parents = getImageParentsByBlockIdAndUrl(
				block.clientId,
				url,
			)?.filter(Boolean);

			if (duotone && parents.length && !map.has(duotone)) {
				parents.forEach((parent) => {
					map.set(parent, duotone);
				});
			}
			seen.add(block.clientId);

			scan(block.innerBlocks || []);
		}
	};

	scan(blocks);
	return Object.fromEntries(map);
};

const getDoc = () =>
	document.querySelector('iframe[name="editor-canvas"]')?.contentDocument ||
	document;

const getImageParentsByBlockIdAndUrl = (id, url) => {
	const doc = getDoc();
	if (!doc) return [];

	const blockElement = doc.querySelector(`[data-block="${id}"]`);
	if (blockElement?.classList) {
		const duotoneClass = [];
		for (const cls of blockElement.classList) {
			if (cls.startsWith('wp-duotone-')) duotoneClass.push(cls);
		}
		if (duotoneClass.length) return duotoneClass;
	}

	const images = doc.querySelectorAll(`img[src="${url}"]`);
	const elements = [];

	for (const image of images) {
		const parent = image.closest('figure[data-block]');
		if (parent?.classList) {
			for (const cls of parent.classList) {
				if (cls.startsWith('wp-duotone-')) elements.push(cls);
			}
		}
	}

	return elements;
};
