import { SharedBlockNotice } from '@agent/components/SharedBlockNotice';
import { fetchBlockCodeById } from '@agent/lib/block-code';
import {
	BLOCK_ID_SEL,
	blockIdOf,
	findBlockEl,
	idAttrOf,
	parseScopedId,
	scopeOf,
} from '@agent/lib/block-el';
import { applyBlockPatch } from '@agent/lib/block-patch';
import { processCustomCss } from '@agent/lib/custom-css';
import { resolveDeleteTarget } from '@agent/lib/delete-target';
import { duplicateMarkup } from '@agent/lib/duplicate-block';
import { buildNewBlock } from '@agent/lib/insertable-blocks';
import { SETTING_TEXT_BLOCKS } from '@agent/lib/setting-text-blocks';
import { useQuickEditStore } from '@quick-edit/state/store';
import { patchVariantClasses } from '@shared/lib/variant-classes';
import apiFetch from '@wordpress/api-fetch';
import { parse } from '@wordpress/blocks';
import { useCallback, useEffect, useRef, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

const dynamicClasses = ['is-style-ext-preset', 'is-style-outline'];
const wpBlockAttributeClasses =
	/^has-([\w-]+-)?(background-color|color|font-size|gradient-background)$|^has-background$|^has-text-color$/;
// Carrying stale align/layout classes renders the preview with the old layout
const layoutEngineClasses =
	/^align(full|wide|left|right|center)$|^is-layout-|^wp-container-|-is-layout-|^is-content-justification-|^is-(vertical|horizontal|nowrap|wrap)$|^has-global-padding$/;
const themeAnimationClasses = /^ext-animated?(-|$)/;

// Re-set ext-animated to prevent animating while patching
const pinThemeAnimations = (el) => {
	for (const node of [el, ...el.querySelectorAll('.ext-animate')]) {
		if (node.classList?.contains('ext-animate'))
			node.dataset.extAnimated = 'true';
	}
};
const PREVIEW_CSS_ATTR = 'data-extendify-preview-css';
const PART_SLUG_ATTR = 'data-extendify-part-slug';

// Without this a later op in the batch can't tell the replacement from the
// same-numbered block in another part.
const carryPartSlug = (from, to) => {
	const slug = from?.getAttribute?.(PART_SLUG_ATTR);
	if (slug) to?.setAttribute?.(PART_SLUG_ATTR, slug);
};

const cssOf = (blockCode) =>
	parse(blockCode)[0]?.attributes?.style?.css || null;

// The wp-container-* layout rules enqueue page-side on a full render only, so
// the fragment ships them and the preview injects them, tagged for teardown.
const injectPreviewStylesheet = (blockId, cssText) => {
	if (!cssText) return;
	const style = document.createElement('style');
	style.setAttribute(PREVIEW_CSS_ATTR, blockId);
	style.textContent = cssText;
	document.head.appendChild(style);
};

// The block fragment ships without style.css's server rule, so inject it here,
// tagged for teardown. No rule means WP discards this CSS too — show nothing.
const injectPreviewCss = (el, blockId, css) => {
	const cls = `ext-preview-css-${blockId}`;
	const rule = processCustomCss(css, `.${cls}`);
	if (!rule) return;
	el.classList.add(cls);
	const style = document.createElement('style');
	style.setAttribute(PREVIEW_CSS_ATTR, blockId);
	style.textContent = rule;
	document.head.appendChild(style);
};

// Swap the rendered preview in for the live element. Returns the detached
// original (restored on cancel), or null when the target isn't on the page.
const previewBlock = async (blockId, newContent, css, scope) => {
	const { content, styles } = await apiFetch({
		path: '/extendify/v1/agent/get-block-html',
		method: 'POST',
		data: { blockCode: newContent },
	});
	const el = findBlockEl(blockId, document, scope);
	if (!el) return null;
	injectPreviewStylesheet(blockId, styles);

	const patched = patchVariantClasses(
		content,
		el.cloneNode(true),
		dynamicClasses,
	);
	const template = document.createElement('template');
	template.innerHTML = patched || '<div style="display:none"></div>';
	const newEl = template.content.firstElementChild;
	if (!newEl) return null;

	// Later ops anchor by id — the replacement and its children keep theirs;
	// an attribute edit preserves child structure, so ids map by position.
	newEl.setAttribute(idAttrOf(el), blockId);
	carryPartSlug(el, newEl);
	for (const tagged of el.querySelectorAll(BLOCK_ID_SEL)) {
		const path = [];
		for (let node = tagged; node !== el; node = node.parentElement) {
			if (!node.parentElement) break;
			path.unshift([...node.parentElement.children].indexOf(node));
		}
		const match = path.reduce((node, i) => node?.children?.[i], newEl);
		match?.setAttribute(idAttrOf(tagged), blockIdOf(tagged));
		carryPartSlug(tagged, match);
	}
	const newElClasses = new Set(newEl.classList);
	el.classList.forEach((className) => {
		if (newElClasses.has(className)) return;
		if (wpBlockAttributeClasses.test(className)) return;
		if (layoutEngineClasses.test(className)) return;
		if (themeAnimationClasses.test(className)) return;
		newEl.classList.add(className);
	});
	// The custom-CSS hash class points at a stale/absent server rule — drop it;
	// injectPreviewCss applies the current css.
	for (const className of [...newEl.classList]) {
		if (
			className === 'has-custom-css' ||
			className.startsWith('wp-custom-css-')
		)
			newEl.classList.remove(className);
	}
	if (css) injectPreviewCss(newEl, blockId, css);
	newEl.setAttribute('data-extendify-temp-replacement', blockId);
	// ext-animate--on sets opacity:0 and won't re-run on a replaced node, so the
	// preview would stay invisible — strip it.
	for (const node of [newEl, ...newEl.querySelectorAll('.ext-animate--on')]) {
		node.classList.remove('ext-animate--on');
	}
	el.parentNode.insertBefore(newEl, el.nextSibling);
	el.parentNode.removeChild(el);
	return el;
};

// A hidden element still counts as a sibling and gives the next block the layout's gap.
const slots = new Map();
const holdSlot = (blockId, parent, before) => {
	const slot = document.createComment('');
	slots.set(blockId, slot);
	parent.insertBefore(slot, before);
};

// Relocate the live node; a slot holds its old place so undo can put it back.
const previewMove = ({ blockId, targetId, position }, scope) => {
	const el = findBlockEl(blockId, document, scope);
	const target = findBlockEl(targetId, document, scope);
	if (!el || !target) return null;
	holdSlot(blockId, el.parentNode, el);
	pinThemeAnimations(el);
	target.parentNode.insertBefore(
		el,
		position === 'after' ? target.nextSibling : target,
	);
	return el;
};

const renderAddedEl = async (block, index) => {
	const { content, styles } = await apiFetch({
		path: '/extendify/v1/agent/get-block-html',
		method: 'POST',
		data: { blockCode: block },
	});
	if (!content) return null;
	injectPreviewStylesheet(`add-${index}`, styles);
	const template = document.createElement('template');
	template.innerHTML = content;
	const newEl = template.content.firstElementChild;
	if (!newEl) return null;
	newEl.setAttribute('data-extendify-temp-addition', '');
	const css = cssOf(block);
	if (css) injectPreviewCss(newEl, `add-${index}`, css);
	for (const node of [newEl, ...newEl.querySelectorAll('.ext-animate--on')]) {
		node.classList.remove('ext-animate--on');
	}
	return newEl;
};

// Render the new block and slot it next to its anchor. Nothing detaches —
// returns true so the caller counts it rendered; undo just removes the node.
const previewAdd = async ({ anchorId, position, block }, index, scope) => {
	const anchor = findBlockEl(anchorId, document, scope);
	if (!anchor) return null;
	const newEl = await renderAddedEl(block, index);
	if (!newEl) return null;
	anchor.parentNode.insertBefore(
		newEl,
		position === 'after' ? anchor.nextSibling : anchor,
	);
	return true;
};

const TEMP_CLASSES_ATTR = 'data-extendify-temp-classes';
const SUBMENU_ITEM_CLASSES = [
	'has-child',
	'open-on-hover-click',
	'wp-block-navigation-submenu',
];
const SUBMENU_OPEN_CLASS = 'extendify-preview-submenu-open';
// WordPress keeps a submenu hidden until hover, which would hide the new link.
const SUBMENU_OPEN_CSS = `.${SUBMENU_OPEN_CLASS} > .wp-block-navigation__submenu-container { visibility: visible !important; opacity: 1 !important; height: auto !important; width: auto !important; min-width: 200px; overflow: visible !important; }`;

const addTempClasses = (el, classes) => {
	const added = classes.filter((name) => !el.classList.contains(name));
	if (!added.length) return;
	el.classList.add(...added);
	const earlier = el.getAttribute(TEMP_CLASSES_ATTR);
	el.setAttribute(
		TEMP_CLASSES_ATTR,
		[earlier, ...added].filter(Boolean).join(' '),
	);
};

const submenuToggle = (label) => {
	const button = document.createElement('button');
	button.className =
		'wp-block-navigation__submenu-icon wp-block-navigation-submenu__toggle';
	button.setAttribute('aria-label', `${label} submenu`);
	button.setAttribute('aria-expanded', 'true');
	button.innerHTML =
		'<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true" focusable="false"><path d="M1.50002 4L6.00002 8L10.5 4" stroke-width="1.5"></path></svg>';
	return button;
};

// Mirrors nestInMenuItem with the markup WordPress renders for a submenu, shown open.
const previewNest = async ({ anchorId, block }, index, scope) => {
	const anchor = findBlockEl(anchorId, document, scope);
	if (!anchor) return null;
	const newEl = await renderAddedEl(block, index);
	if (!newEl) return null;
	const existing = anchor.querySelector(
		':scope > .wp-block-navigation__submenu-container',
	);
	const list = existing ?? document.createElement('ul');
	if (!existing) {
		// A sibling dropdown carries the menu's submenu colours; copy them.
		list.className =
			anchor
				.closest('.wp-block-navigation')
				?.querySelector('.wp-block-navigation__submenu-container')?.className ??
			'wp-block-navigation__submenu-container wp-block-navigation-submenu';
		const toggle = submenuToggle(anchor.textContent.trim());
		for (const el of [toggle, list]) {
			el.setAttribute('data-extendify-temp-addition', '');
		}
		addTempClasses(anchor, SUBMENU_ITEM_CLASSES);
		anchor.append(toggle, list);
	}
	list.appendChild(newEl);
	addTempClasses(anchor, [SUBMENU_OPEN_CLASS]);
	injectPreviewStylesheet(`nest-${index}`, SUBMENU_OPEN_CSS);
	return true;
};

// Mirror the server's column routing off the DOM (spliceColumn owns the why).
const previewColumnAdd = async (
	{ anchorId, position, block },
	index,
	wrappers,
	scope,
) => {
	const anchor = findBlockEl(anchorId, document, scope);
	if (!anchor) return null;
	if (anchor.classList.contains('wp-block-column')) {
		return previewAdd({ anchorId, position, block }, index, scope);
	}
	const shared = wrappers.get(`${anchorId}:${position}`);
	if (shared) {
		const newEl = await renderAddedEl(block, index);
		if (!newEl) return null;
		shared.appendChild(newEl);
		return true;
	}
	const newEl = await renderAddedEl(
		`<!-- wp:columns --><div class="wp-block-columns">${block}</div><!-- /wp:columns -->`,
		index,
	);
	if (!newEl) return null;
	anchor.parentNode.insertBefore(
		newEl,
		position === 'after' ? anchor.nextSibling : anchor,
	);
	wrappers.set(`${anchorId}:${position}`, newEl);
	return true;
};

// Keyed by the model-facing container word — the code supplies the
// core/columns parent a bare column needs, mirroring the server templates.
const WRAP_SHELLS = {
	'core/column':
		'<!-- wp:columns --><div class="wp-block-columns"><!-- wp:column --><div class="wp-block-column"></div><!-- /wp:column --></div><!-- /wp:columns -->',
	'core/group':
		'<!-- wp:group {"layout":{"type":"constrained"}} --><div class="wp-block-group"></div><!-- /wp:group -->',
};

// The relocated node keeps its block id, so a later add in the batch can
// still anchor to it; a slot holds its old place for undo.
const previewWrap = async ({ blockId, container }, wrappers, scope) => {
	const el = findBlockEl(blockId, document, scope);
	const shellCode = WRAP_SHELLS[container];
	if (!el || !shellCode) return null;
	// Two column wraps in one batch share one section, mirroring the save.
	const sharedShell =
		container === 'core/column' ? wrappers.get('wrap-shell') : null;
	if (sharedShell && !el.contains(sharedShell)) {
		holdSlot(blockId, el.parentNode, el);
		const column = document.createElement('div');
		column.className = 'wp-block-column';
		pinThemeAnimations(el);
		column.appendChild(el);
		sharedShell.appendChild(column);
		wrappers.set(`${blockId}:after`, sharedShell);
		wrappers.set(`${blockId}:before`, sharedShell);
		return el;
	}
	const { content } = await apiFetch({
		path: '/extendify/v1/agent/get-block-html',
		method: 'POST',
		data: { blockCode: shellCode },
	});
	const template = document.createElement('template');
	template.innerHTML = content ?? '';
	const shell = template.content.firstElementChild;
	if (!shell) return null;
	shell.setAttribute('data-extendify-temp-addition', '');
	if (container === 'core/column') {
		// A later column add anchored to the wrapped block joins this shell.
		wrappers.set(`${blockId}:after`, shell);
		wrappers.set(`${blockId}:before`, shell);
		wrappers.set('wrap-shell', shell);
	}
	el.parentNode.insertBefore(shell, el);
	holdSlot(blockId, el.parentNode, el);
	pinThemeAnimations(el);
	(shell.querySelector('.wp-block-column') ?? shell).appendChild(el);
	return el;
};

// A fresh render numbers style variants the page has no CSS for.
const renderCopyOf = async (el, markup, index) => {
	const { content, styles } = await apiFetch({
		path: '/extendify/v1/agent/get-block-html',
		method: 'POST',
		data: { blockCode: markup },
	});
	injectPreviewStylesheet(`copy-${index}`, styles);
	const template = document.createElement('template');
	template.innerHTML =
		patchVariantClasses(content ?? '', el.cloneNode(true), dynamicClasses) ||
		'';
	return template.content.firstElementChild;
};

// Id-less, or a later op in the batch could land on the copy.
const previewDuplicate = async (
	{ blockId, targetId, position, markup },
	index,
	scope,
) => {
	const el = findBlockEl(blockId, document, scope);
	const anchor = targetId ? findBlockEl(targetId, document, scope) : el;
	if (!el || !anchor) return null;
	const copy = markup
		? await renderCopyOf(el, markup, index)
		: el.cloneNode(true);
	if (!copy) return null;
	for (const node of [copy, ...copy.querySelectorAll(BLOCK_ID_SEL)]) {
		node.removeAttribute(idAttrOf(node));
	}
	for (const node of [copy, ...copy.querySelectorAll('.ext-animate--on')]) {
		node.classList.remove('ext-animate--on');
	}
	copy.setAttribute('data-extendify-temp-addition', '');
	anchor.parentNode.insertBefore(
		copy,
		position === 'before' ? anchor : anchor.nextSibling,
	);
	return true;
};

// Re-rendering the markup would preview the old text — the option holds it.
const previewSettingText = (blockId, text, scope) => {
	const el = findBlockEl(blockId, document, scope);
	if (!el) return null;
	const preview = el.cloneNode(true);
	const textNode = preview.querySelector('a') ?? preview;
	textNode.textContent = text;
	preview.setAttribute('data-extendify-temp-replacement', blockId);
	el.parentNode.insertBefore(preview, el.nextSibling);
	el.parentNode.removeChild(el);
	return el;
};

// Remove the target, leaving a slot so cancel restores it like a swapped preview.
const previewDelete = (blockId, scope) => {
	const el = findBlockEl(blockId, document, scope);
	if (!el) return null;
	holdSlot(blockId, el.parentNode, el);
	el.parentNode.removeChild(el);
	return el;
};

// The DOM attribute and the save both carry the bare id, not the scoped one.
const unscope = (operation, fallback) => {
	if (!operation) return { operation, scope: fallback };
	const next = { ...operation };
	let partSlug = null;
	for (const field of ['blockId', 'anchorId', 'targetId']) {
		if (next[field] == null) continue;
		const parsed = parseScopedId(next[field]);
		if (parsed.partSlug) partSlug = parsed.partSlug;
		next[field] = parsed.blockId;
	}
	if (Array.isArray(next.texts)) {
		next.texts = next.texts.map((entry) => ({
			...entry,
			blockId: parseScopedId(entry.blockId).blockId,
		}));
	}
	return { operation: next, scope: partSlug ? { partSlug } : fallback };
};

// Each target pairs the operation that saves with the preview that shows it.
// Delete and move ids resolve off the pristine DOM before the preview
// detaches anything, so preview + save agree on wrapper targets.
const buildOperationTarget = async (
	rawOperation,
	block,
	postId,
	index,
	wrappers,
) => {
	const { operation, scope } = unscope(rawOperation, scopeOf(block));
	if (operation?.op === 'add') {
		// Same builder the save-time tool uses, so preview and save agree.
		const markup = buildNewBlock(
			operation.blockType,
			operation.patch,
			operation.clear ?? [],
			window.extAgentData?.context?.presetSlugs ?? {},
		);
		return {
			operation,
			preview: () => {
				if (!markup) return null;
				const withMarkup = { ...operation, block: markup };
				if (operation.position === 'inside') {
					return previewNest(withMarkup, index, scope);
				}
				return operation.blockType === 'core/column'
					? previewColumnAdd(withMarkup, index, wrappers, scope)
					: previewAdd(withMarkup, index, scope);
			},
		};
	}
	if (operation?.op === 'wrap') {
		// Wrapping just a lone child nests the new container inside its old wrapper.
		const resolved = {
			...operation,
			blockId: resolveDeleteTarget(operation.blockId, scope),
		};
		return {
			operation: resolved,
			preview: () => previewWrap(resolved, wrappers, scope),
		};
	}
	if (operation?.op === 'duplicate') {
		const markup = await duplicateMarkup(operation, block?.source, postId);
		return {
			operation,
			preview: () => previewDuplicate({ ...operation, markup }, index, scope),
		};
	}
	if (operation?.op === 'move') {
		const resolved = {
			...operation,
			blockId: resolveDeleteTarget(operation.blockId, scope),
		};
		return { operation: resolved, preview: () => previewMove(resolved, scope) };
	}
	if (operation?.op === 'delete') {
		const resolved = {
			...operation,
			blockId: resolveDeleteTarget(operation.blockId, scope),
		};
		return {
			operation: resolved,
			preview: () => previewDelete(resolved.blockId, scope),
		};
	}
	// Image swaps live in ReplaceImageConfirm; a stray one here saves as no-change.
	if (operation?.op === 'replace-image')
		return { operation, preview: () => null };
	const { blockId, patch, clear } = operation ?? {};
	if (SETTING_TEXT_BLOCKS[block?.blockType] && patch?.text != null) {
		return {
			operation,
			preview: () => previewSettingText(blockId, patch.text, scope),
		};
	}
	const newContent = applyBlockPatch(
		await fetchBlockCodeById(blockId, block?.source, postId),
		patch,
		clear ?? [],
		window.extAgentData?.context?.presetSlugs ?? {},
	);
	return {
		operation,
		preview: () =>
			newContent
				? previewBlock(blockId, newContent, cssOf(newContent), scope)
				: null,
	};
};

// block-general workflows still send a whole-block newContent replace.
const buildLegacyTarget = (inputs, block) => ({
	operation: null,
	preview: () =>
		inputs.newContent
			? previewBlock(
					block?.id,
					inputs.newContent,
					cssOf(inputs.newContent),
					scopeOf(block),
				)
			: null,
});

export const UpdateBlockConfirm = ({
	inputs,
	onConfirm,
	onCancel,
	onRetry,
}) => {
	const block = useQuickEditStore((s) => s.agentBlock);
	const [loading, setLoading] = useState(true);
	const detached = useRef([]);
	// What actually saves — delete rewrites this to the DOM-resolved wrapper ids.
	const saveData = useRef(inputs);

	const operations = Array.isArray(inputs.operations)
		? inputs.operations
		: null;

	const undoBlockChange = useCallback(() => {
		for (const original of detached.current) {
			const id = blockIdOf(original);
			const replacement =
				document.querySelector(
					`[data-extendify-temp-replacement="${CSS.escape(id)}"]`,
				) ?? slots.get(id);
			slots.delete(id);
			pinThemeAnimations(original);
			replacement?.parentNode?.insertBefore(original, replacement);
			replacement?.remove();
		}
		for (const added of document.querySelectorAll(
			'[data-extendify-temp-addition]',
		))
			added.remove();
		for (const dressed of document.querySelectorAll(`[${TEMP_CLASSES_ATTR}]`)) {
			dressed.classList.remove(
				...dressed.getAttribute(TEMP_CLASSES_ATTR).split(' '),
			);
			dressed.removeAttribute(TEMP_CLASSES_ATTR);
		}
		for (const style of document.querySelectorAll(`style[${PREVIEW_CSS_ATTR}]`))
			style.remove();
		detached.current = [];
	}, []);

	const confirmed = useRef(false);
	const unmounted = useRef(false);
	useEffect(() => {
		return () => {
			unmounted.current = true;
			if (!confirmed.current) undoBlockChange();
		};
	}, [undoBlockChange]);

	const handleConfirm = async () => {
		confirmed.current = true;
		await onConfirm({ data: saveData.current, shouldRefreshPage: true });
	};

	const handleRetry = useCallback(() => {
		undoBlockChange();
		onRetry();
	}, [undoBlockChange, onRetry]);

	// Re-renders (the staged block changes identity on page clicks) must not
	// inject the preview again and clobber the undo list.
	const previewed = useRef(false);
	useEffect(() => {
		if (previewed.current) return;
		previewed.current = true;
		const run = async () => {
			const postId = window.extAgentData?.context?.postId;
			const operations = Array.isArray(inputs.operations)
				? inputs.operations
				: null;
			const wrappers = new Map();
			const targets = operations
				? await Promise.all(
						operations.map((operation, index) =>
							buildOperationTarget(operation, block, postId, index, wrappers),
						),
					)
				: [buildLegacyTarget(inputs, block)];
			if (operations)
				saveData.current = {
					...inputs,
					operations: targets.map(({ operation }) => operation),
				};

			const originals = [];
			let rendered = 0;
			for (const target of targets) {
				const original = await target.preview();
				if (!original) continue;
				rendered++;
				// An add preview has no original to restore — only count it.
				if (original !== true) originals.push(original);
			}
			detached.current = originals;
			// An unmount mid-preview already ran its undo; skipping this leaves the preview stuck.
			if (unmounted.current) return undoBlockChange();
			// Nothing rendered means none of the target blocks are on the page.
			if (!rendered) return onCancel();
			setLoading(false);
		};
		run();
	}, [block, inputs, onCancel, operations, undoBlockChange]);

	if (loading)
		return (
			<Wrapper>
				<Content>{__('Loading...', 'extendify-local')}</Content>
			</Wrapper>
		);

	const onlyOp = (op) =>
		Array.isArray(inputs.operations) &&
		inputs.operations.every((operation) => operation?.op === op);
	const message = onlyOp('delete')
		? __(
				'The agent will remove the selected block. Please review and confirm.',
				'extendify-local',
			)
		: onlyOp('move')
			? __(
					'The agent has rearranged the blocks in the browser. Please review and confirm.',
					'extendify-local',
				)
			: onlyOp('add')
				? __(
						'The agent has added the new block in the browser. Please review and confirm.',
						'extendify-local',
					)
				: onlyOp('wrap')
					? __(
							'The agent has placed the block in its new container in the browser. Please review and confirm.',
							'extendify-local',
						)
					: onlyOp('duplicate')
						? __(
								'The agent has copied the block in the browser. Please review and confirm.',
								'extendify-local',
							)
						: __(
								'The agent has made the changes in the browser. Please review and confirm.',
								'extendify-local',
							);

	return (
		<Wrapper>
			<Content>
				<p className="m-0 p-0 text-sm text-gray-900">{message}</p>
				<SharedBlockNotice
					blockIds={[
						...(operations ?? []).map((operation) => operation?.blockId),
						block?.id,
					]}
				/>
			</Content>
			<div className="flex flex-wrap justify-start gap-2 p-3">
				<button
					type="button"
					className="flex-1 rounded-sm border border-gray-500 bg-white p-2 text-sm text-gray-900"
					onClick={onCancel}
				>
					{__('Cancel', 'extendify-local')}
				</button>
				<button
					type="button"
					className="flex-1 rounded-sm border border-gray-500 bg-white p-2 text-sm text-gray-900"
					onClick={handleRetry}
				>
					{__('Try Again', 'extendify-local')}
				</button>
				<button
					type="button"
					className="flex-1 rounded-sm border border-design-main bg-design-main p-2 text-sm text-white"
					onClick={handleConfirm}
				>
					{__('Save', 'extendify-local')}
				</button>
			</div>
		</Wrapper>
	);
};

const Wrapper = ({ children }) => (
	<div className="mb-4 ms-2 me-2 flex flex-col rounded-lg border border-gray-300 bg-gray-50">
		{children}
	</div>
);

const Content = ({ children }) => (
	<div className="rounded-lg border-b border-gray-300 bg-white">
		<div className="p-3">{children}</div>
	</div>
);
