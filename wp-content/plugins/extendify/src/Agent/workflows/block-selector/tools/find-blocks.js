import {
	blockIdOf,
	parseScopedId,
	resolveScopedId,
	scopedBlockId,
} from '@agent/lib/block-el';
import { IGNORED_BLOCKS } from '@agent/lib/classify-block-edit';
import { buildSubtreeManifest } from '@agent/lib/subtree-manifest';
import { DYNAMIC_BLOCK_TYPES } from '@quick-edit/lib/agent-gate';

// Reachable once selected — the logo's image bridges to the site setting — but
// never worth offering unprompted, since it has a workflow of its own.
const OWN_WORKFLOW_BLOCKS = new Set(['core/site-logo']);

// Page candidates come first, so one shared budget leaves the header none.
const MAX_PAGE_CANDIDATES = 15;
const MAX_PART_CANDIDATES = 5;

const PART_SLUG_ATTR = 'data-extendify-part-slug';
const PART_LABEL_ATTR = 'data-extendify-part';

// One root sees only its own part, so the page root misses header and footer.
const scopeRoots = (pageRoot) => {
	const roots = [pageRoot];
	for (const el of document.querySelectorAll(`[${PART_SLUG_ATTR}]`)) {
		const slug = el.getAttribute(PART_SLUG_ATTR);
		if (!slug) continue;
		// A part's top-level blocks are siblings; unrooted, all but the first go unwalked.
		const enclosing = el.parentElement?.closest(
			`[${PART_SLUG_ATTR}="${CSS.escape(slug)}"]`,
		);
		if (!enclosing) roots.push(el);
	}
	return roots;
};

const manifestFor = (root) => {
	const slug = root?.getAttribute?.(PART_SLUG_ATTR) ?? null;
	const part = root?.getAttribute?.(PART_LABEL_ATTR) ?? null;
	return buildSubtreeManifest(root).map((entry) => ({
		...entry,
		blockId: scopedBlockId(entry.blockId, slug),
		...(part && { part }),
	}));
};

// An item can't add a sibling, nor stand in for the whole set.
export const CONTAINER_TYPES = new Set([
	'core/columns',
	'core/list',
	'core/group',
]);

const addressable = (type) =>
	!DYNAMIC_BLOCK_TYPES.has(type) &&
	!IGNORED_BLOCKS.has(type) &&
	!OWN_WORKFLOW_BLOCKS.has(type);

const containersFor = (matches, byId) => {
	const found = new Map();
	for (const { blockId } of matches) {
		let node = resolveScopedId(blockId)?.parentElement;
		while (node) {
			const slug = node.getAttribute?.(PART_SLUG_ATTR) ?? null;
			const raw = blockIdOf(node);
			const id = raw ? scopedBlockId(raw, slug) : null;
			const entry = id ? byId.get(id) : null;
			if (entry && CONTAINER_TYPES.has(entry.type)) {
				found.set(id, entry);
				break;
			}
			node = node.parentElement;
		}
	}
	return [...found.values()];
};

// A search for "footer" arrives as text and would otherwise match nothing.
const matchesText = ({ text: blockText, part }, text) => {
	if (!text) return true;
	const needle = text.toLowerCase();
	if ((blockText ?? '').toLowerCase().includes(needle)) return true;
	return Boolean(part) && needle.includes(part.toLowerCase());
};

const matchesType = (type, blockTypes) =>
	!blockTypes?.length || blockTypes.includes(type);

const matchesPart = (entry, part) =>
	!part || (entry.part ?? '').toLowerCase() === part.toLowerCase();

const capPerScope = (found) => {
	const taken = new Map();
	return found.filter(({ blockId }) => {
		const { partSlug } = parseScopedId(blockId);
		const cap = partSlug ? MAX_PART_CANDIDATES : MAX_PAGE_CANDIDATES;
		const used = taken.get(partSlug) ?? 0;
		if (used >= cap) return false;
		taken.set(partSlug, used + 1);
		return true;
	});
};

export default ({ blockTypes, text, part } = {}) => {
	const root = document.querySelector('.wp-site-blocks') ?? document.body;
	const all = scopeRoots(root)
		.flatMap(manifestFor)
		.filter((entry) => addressable(entry.type) && matchesPart(entry, part));
	const byId = new Map(all.map((entry) => [entry.blockId, entry]));
	const byType = all.filter(({ type }) => matchesType(type, blockTypes));
	const matches = byType.filter((entry) => matchesText(entry, text));
	// "hero" is a position, not text: AND-ing it would match nothing.
	const textIgnored =
		Boolean(text) &&
		Boolean(blockTypes?.length) &&
		!matches.length &&
		byType.length > 0;
	// core/navigation is unaddressable, so a menu search can match no type at all.
	const byText = all.filter((entry) => matchesText(entry, text));
	const typeIgnored =
		Boolean(text) &&
		Boolean(blockTypes?.length) &&
		!matches.length &&
		!byType.length &&
		byText.length > 0;
	const found = textIgnored ? byType : typeIgnored ? byText : matches;
	// Cap first, or a long match list truncates the containers away.
	const shown = capPerScope(found);
	const containers = containersFor(shown, byId).filter(
		(entry) => !shown.some(({ blockId }) => blockId === entry.blockId),
	);
	return {
		blockSearch: {
			total: found.length,
			...(textIgnored && { ignoredText: text }),
			...(typeIgnored && { ignoredBlockTypes: blockTypes }),
			candidates: [...shown, ...containers],
		},
	};
};
