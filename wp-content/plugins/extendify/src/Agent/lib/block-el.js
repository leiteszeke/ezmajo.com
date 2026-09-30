// Post content and template parts each have their own tagger and id space, so
// a rendered block answers to whichever attribute stamped it.
const ID_ATTRS = [
	'data-extendify-agent-block-id',
	'data-extendify-part-block-id',
];

export const BLOCK_ID_SEL = ID_ATTRS.map((attr) => `[${attr}]`).join(', ');

export const idAttrOf = (el) =>
	ID_ATTRS.find((attr) => el?.getAttribute?.(attr) != null) ?? ID_ATTRS[0];

export const blockIdOf = (el) => {
	const attr = ID_ATTRS.find((a) => el?.getAttribute?.(a));
	return attr ? el.getAttribute(attr) : null;
};

// A nav's hidden overlay copy comes first, so an unfiltered match is invisible.
const isRendered = (el) => {
	for (let node = el; node; node = node.parentElement) {
		const style = node.ownerDocument?.defaultView?.getComputedStyle?.(node);
		if (!style) return true;
		if (style.display === 'none' || style.visibility === 'hidden') return false;
	}
	return true;
};

const PART_SLUG_ATTR = 'data-extendify-part-slug';

const slugOf = (el) =>
	el?.closest?.(`[${PART_SLUG_ATTR}]`)?.getAttribute(PART_SLUG_ATTR) ?? null;

export const scopeOf = (block) => ({
	partSlug: block?.source?.partSlug || null,
});

// Every part numbers from 1, so id 3 exists in the page, header and footer.
const SCOPED_ID_RX = /^part:([^:]+):(.+)$/;

export const scopedBlockId = (blockId, partSlug) =>
	partSlug ? `part:${partSlug}:${blockId}` : String(blockId);

export const parseScopedId = (blockId) => {
	const match = SCOPED_ID_RX.exec(String(blockId ?? ''));
	return match
		? { partSlug: match[1], blockId: match[2] }
		: { partSlug: null, blockId: String(blockId ?? '') };
};

// An unqualified id means post content; unscoped it would match the header's.
export const resolveScopedId = (scopedId, root = document) => {
	const { partSlug, blockId } = parseScopedId(scopedId);
	return findBlockEl(blockId, root, { partSlug });
};

// Parts render first and every space numbers from 1, so an unscoped id hits
// the header.
export const findBlockEl = (blockId, root = document, scope = null) => {
	const matches = [
		...root.querySelectorAll(
			ID_ATTRS.map((attr) => `[${attr}="${CSS.escape(String(blockId))}"]`).join(
				', ',
			),
		),
	];
	if (matches.length < 2) return matches[0] ?? null;
	const inScope = scope
		? matches.filter((el) => slugOf(el) === (scope.partSlug || null))
		: [];
	// A pattern used in both a part and post content may only render outside scope.
	const pool = inScope.length ? inScope : matches;
	return pool.find(isRendered) ?? pool[0];
};
