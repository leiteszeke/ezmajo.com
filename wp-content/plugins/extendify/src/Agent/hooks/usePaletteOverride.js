import { refreshBlockHighlight } from '@agent/lib/block-highlight';
import { getDynamicDuotoneMap } from '@agent/lib/svg-blocks-scanner';
import { replaceDuotoneSVG } from '@agent/lib/svg-helpers';
import { isInEditor } from '@agent/lib/util';
import { parse } from '@wordpress/blocks';
import { useSelect } from '@wordpress/data';
import { useCallback, useEffect, useRef, useState } from '@wordpress/element';

const styleId = 'extendify-palette-preview-css';
const editorIframeSelector = 'iframe[name="editor-canvas"]';
const editorStylesWrapper = '.editor-styles-wrapper';

const getEditorDocument = () =>
	document.querySelector(editorIframeSelector)?.contentDocument || document;

// Ties core's own rules at 0-1-0, so it only wins by coming after them.
const appendStyle = (doc, parent) => {
	const existing = doc.getElementById(styleId);
	if (existing) return existing;

	const style = doc.createElement('style');
	style.id = styleId;
	parent.appendChild(style);
	return style;
};

// The unframed editor has no <body> of its own to grade.
const forEditorWithoutIframe = (css) =>
	css
		.replaceAll(':root :where(body)', editorStylesWrapper)
		.replaceAll(':root', editorStylesWrapper);

export const usePaletteOverride = ({ css, duotoneTheme }) => {
	const duotoneCleanup = useRef(null);
	const [theDocument, setDocument] = useState(null);
	const onEditor = isInEditor();

	useEffect(() => {
		if (!css || onEditor) return;
		appendStyle(document, document.head).innerHTML = css;
		refreshBlockHighlight();
	}, [css, onEditor]);

	useEffect(() => {
		if (!css || !theDocument || !onEditor) return;
		const hasIframe = document.querySelector(editorIframeSelector);
		appendStyle(theDocument, theDocument.body).innerHTML = hasIframe
			? css
			: forEditorWithoutIframe(css);
	}, [css, theDocument, onEditor]);

	useEffect(() => {
		if (theDocument || !onEditor) return;
		const timer = setTimeout(() => {
			const doc = getEditorDocument();
			if (doc?.body) setDocument(doc);
		}, 300); // wait for iframe
		return () => clearTimeout(timer);
	}, [theDocument, onEditor]);

	const dynamicDuotone = useSelect((select) => {
		let blocks = select('core/block-editor')?.getBlocks?.() ?? [];

		if (blocks.find((block) => block.name === 'core/template-part')) {
			const { getEditedPostContent } = select('core/editor');
			blocks = parse(getEditedPostContent(), {});
		}

		return getDynamicDuotoneMap(blocks);
	}, []);

	useEffect(() => {
		// A palette without duotone must still clear the last one's svg filter.
		duotoneCleanup.current?.();
		duotoneCleanup.current = duotoneTheme
			? replaceDuotoneSVG({ duotoneTheme, dynamicDuotone })
			: null;
	}, [css, duotoneTheme, dynamicDuotone]);

	const undoChange = useCallback(() => {
		duotoneCleanup.current?.();
		duotoneCleanup.current = null;

		document.getElementById(styleId)?.remove();
		if (onEditor) getEditorDocument()?.getElementById(styleId)?.remove();
	}, [onEditor]);

	return { undoChange };
};
