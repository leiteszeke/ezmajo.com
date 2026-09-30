import { useSiteVibesVariations } from '@agent/hooks/useSiteVibesVariations';
import { refreshBlockHighlight } from '@agent/lib/block-highlight';
import { isInEditor } from '@agent/lib/util';
import { useCallback, useEffect, useRef, useState } from '@wordpress/element';

const styleId = 'block-style-variation-styles-inline-css';
const editorIframeSelector = 'iframe[name="editor-canvas"]';
const editorStylesWrapper = '.editor-styles-wrapper';

const getEditorDocument = () => {
	const iframe = document.querySelector(editorIframeSelector);
	return iframe?.contentDocument || document;
};

// update the CSS so that it won't affect the switcher preview area
const transformVibeCSS = (css, slug) => css.replaceAll(slug, 'natural-1');

export const useSiteVibesOverride = ({ css: vibeCss, slug }) => {
	const blockStyles = useRef(null);
	const [theDocument, setDocument] = useState(null);
	const onEditor = isInEditor();
	const { data } = useSiteVibesVariations();
	const css = vibeCss ? `${data?.resets?.[slug] ?? ''}${vibeCss}` : vibeCss;

	useEffect(() => {
		if (!css || onEditor || !slug) return;
		const style = document.getElementById(styleId);
		if (!style) return;
		if (!blockStyles.current) {
			blockStyles.current = style.innerHTML;
		}
		style.innerHTML = transformVibeCSS(css, slug);
		refreshBlockHighlight();
	}, [css, slug, onEditor]);

	useEffect(() => {
		if (!css || !theDocument || !onEditor) return;
		const style = theDocument.getElementById(styleId);
		const hasIframe = document.querySelector(editorIframeSelector);

		let modifiedCss = css
			.replaceAll(':root', hasIframe ? ':root' : editorStylesWrapper)
			.replaceAll(slug, 'natural-1')
			.replace(
				/:where\(([^)]+)\)/g,
				':where($1):not(.ext-vibe-container, .ext-vibe-container *)',
			);

		if (!hasIframe) {
			modifiedCss = modifiedCss
				.replace('body{', `${editorStylesWrapper}{`)
				.replace(
					/(h[1-6](?:\s*,\s*h[1-6])*)\s*\{/g,
					`${editorStylesWrapper} $1{`,
				);
		}

		style.innerHTML = modifiedCss;
	}, [css, slug, theDocument, onEditor]);

	useEffect(() => {
		if (theDocument) return;
		const timer = setTimeout(() => {
			if (theDocument) return;
			const doc = getEditorDocument();
			if (!doc || !doc.body) return;
			const newStyle = doc.createElement('style');
			newStyle.id = styleId;
			doc.body.appendChild(newStyle);
			setDocument(doc);
		}, 300);
		return () => clearTimeout(timer);
	}, [theDocument]);

	const undoChange = useCallback(() => {
		const style = document.getElementById(styleId);
		if (style && blockStyles.current) {
			style.innerHTML = blockStyles.current;
		}

		if (!onEditor) return;
		const doc = getEditorDocument();
		doc?.getElementById(styleId)?.remove();
	}, [onEditor]);

	return { undoChange };
};
