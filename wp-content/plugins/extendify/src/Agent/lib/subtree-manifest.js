import { BLOCK_ID_SEL, blockIdOf } from './block-el';
import { detectBlockType } from './block-type';
import { readComputedStyles } from './computed-styles';

// Signal-less but edit targets ("swap the columns", "round the image") — dropped, they're unaddressable.
const ALWAYS_KEPT_TYPES = new Set([
	'core/column',
	'core/columns',
	'core/image',
	'core/cover',
	'core/site-logo',
]);

const isTransparent = (value) =>
	!value ||
	value === 'transparent' ||
	value.replace(/\s/g, '') === 'rgba(0,0,0,0)';

// core/button renders text + background in an inner link, so read styles off the
// link — only for buttons, or a container would report a nested button's styles.
const styleSource = (el) =>
	el.classList?.contains('wp-block-button')
		? (el.querySelector('.wp-block-button__link') ?? el)
		: el;

// Narrow by appearance — a token like `tertiary` says nothing about being yellow.
const renderedStyles = (el) => {
	const styles = readComputedStyles(styleSource(el));
	if (styles && isTransparent(styles.backgroundColor))
		delete styles.backgroundColor;
	return styles && Object.keys(styles).length ? styles : null;
};

// style.css lives in a scoped `wp-custom-css-*` rule, invisible in the block code.
const customCss = (el) => {
	const cls = [...(el.classList ?? [])].find((c) =>
		c.startsWith('wp-custom-css-'),
	);
	if (!cls) return null;
	for (const sheet of el.ownerDocument?.styleSheets ?? []) {
		let rules;
		try {
			rules = sheet.cssRules;
		} catch {
			continue; // cross-origin sheet — can't read
		}
		for (const rule of rules) {
			if (rule.selectorText?.includes(cls)) return rule.style?.cssText || null;
		}
	}
	return null;
};

const PART_SLUG_ATTR = 'data-extendify-part-slug';

// One request carries one partSlug, so a nested part's blocks would resolve
// against the wrong post.
const partScope = (root) => {
	const rootSlug = root?.getAttribute?.(PART_SLUG_ATTR) ?? null;
	return (el) => (el?.getAttribute?.(PART_SLUG_ATTR) ?? null) === rootSlug;
};

// Stops at nested tagged blocks so a container's text never bleeds from its children.
const ownSubtree = (el) => {
	const clone = el.cloneNode(true);
	for (const nested of clone.querySelectorAll(BLOCK_ID_SEL)) nested.remove();
	return clone;
};

const ownText = (clone) => {
	const text = (clone.textContent || '').replace(/\s+/g, ' ').trim();
	return text.length > 80 ? `${text.slice(0, 80)}…` : text;
};

const colorSlugs = (clone) => {
	const out = {};
	const nodes = [clone, ...clone.querySelectorAll('*')];
	for (const node of nodes) {
		for (const cls of node.classList ?? []) {
			const bg = cls.match(/^has-(.+)-background-color$/);
			if (bg) out.backgroundColor = bg[1];
			else if (cls !== 'has-text-color') {
				const text = cls.match(/^has-(.+)-color$/);
				if (text) out.textColor = text[1];
			}
		}
	}
	return out;
};

// Per-block summary of the selection — enough context for the agent to pick
// targets ("the red button"); schemas + full code are fetched after the pick.
export const buildSubtreeManifest = (root) => {
	if (!root) return [];
	const manifest = [];
	const inScope = partScope(root);
	// A directly-selected block is its own (and only) target, so the root is included.
	const els = [root, ...root.querySelectorAll(BLOCK_ID_SEL)].filter(inScope);
	for (const [index, el] of els.entries()) {
		const blockId = blockIdOf(el);
		if (!blockId) continue;
		const type = detectBlockType(el);
		if (!type) continue;
		const clone = ownSubtree(el);
		const text = ownText(clone);
		const colors = colorSlugs(clone);
		// Drop signal-less descendants, never the root (baseline for relative edits).
		if (
			index > 0 &&
			!ALWAYS_KEPT_TYPES.has(type) &&
			!text &&
			!colors.backgroundColor &&
			!colors.textColor
		)
			continue;
		const styles = renderedStyles(el);
		const css = customCss(el);
		manifest.push({
			blockId,
			type,
			...(text && { text }),
			...colors,
			...(styles && { styles }),
			...(css && { css }),
		});
	}
	return manifest;
};

// Tagged blocks directly beneath el, past any untagged wrappers.
const childBlockEls = (el, inScope) => {
	const out = [];
	for (const child of el.children ?? []) {
		if (!inScope(child)) continue;
		if (blockIdOf(child)) out.push(child);
		else out.push(...childBlockEls(child, inScope));
	}
	return out;
};

// Keeps every tagged block; the flat manifest drops signal-less ones.
const treeNodesFor = (el, inScope) =>
	childBlockEls(el, inScope).flatMap((child) => {
		const type = detectBlockType(child);
		const children = treeNodesFor(child, inScope);
		const blockId = blockIdOf(child);
		if (!type || !blockId) return children;
		return [
			{
				blockId,
				type,
				...(children.length && { children }),
			},
		];
	});

// Nested block structure for the selection.
export const buildSubtreeTree = (root) =>
	root ? treeNodesFor({ children: [root] }, partScope(root)) : [];
