import { refreshBlockHighlight } from '@agent/lib/block-highlight';
import { getDynamicDuotoneMap } from '@agent/lib/svg-blocks-scanner';
import { replaceDuotoneSVG } from '@agent/lib/svg-helpers';
import { parse } from '@wordpress/blocks';
import { useSelect } from '@wordpress/data';
import { useCallback, useEffect, useRef, useState } from '@wordpress/element';

const id = 'global-styles-inline-css';
const path = window.location.pathname;
const s = new URLSearchParams(window.location.search);
const onEditor =
	path.includes('/wp-admin/post.php') && s.get('action') === 'edit';

export const useVariationOverride = ({ css, duotoneTheme }) => {
	const frontStyles = useRef(null);
	const duotoneCleanup = useRef(null);
	const [theDocument, setDocument] = useState(null);

	useEffect(() => {
		if (!css || onEditor) return;
		const style = document.getElementById(id);
		if (!style) return;
		if (!frontStyles.current) {
			frontStyles.current = style.innerHTML;
		}
		style.innerHTML = css;
		refreshBlockHighlight();
	}, [css]);

	// Handle the editor
	useEffect(() => {
		if (!css || !theDocument || !onEditor) return;
		const style = theDocument.getElementById(id);
		const hasIframe = document.querySelector('iframe[name="editor-canvas"]');
		style.innerHTML = css.replaceAll(
			':root',
			// If the iframe was removed, target the editor the old way
			hasIframe ? ':root' : '.editor-styles-wrapper',
		);
	}, [css, theDocument]);

	useEffect(() => {
		if (theDocument) return;
		const timer = setTimeout(() => {
			if (theDocument) return;
			const frame = document.querySelector('iframe[name="editor-canvas"]');
			const doc = frame?.contentDocument || document;
			if (!doc || !doc.body) return;
			// Add a tag to the body
			const newStyle = doc.createElement('style');
			newStyle.id = id;
			doc.body.appendChild(newStyle);
			setDocument(doc);
		}, 300); // wait for iframe
		return () => clearTimeout(timer);
	}, [theDocument]);

	const dynamicDuotone = useSelect((select) => {
		let blocks = select('core/block-editor')?.getBlocks?.() ?? [];

		const hasShowTemplateOn = blocks.find(
			(block) => block.name === 'core/template-part',
		);

		if (hasShowTemplateOn) {
			const { getEditedPostContent } = select('core/editor');
			blocks = parse(getEditedPostContent(), {});
		}

		return getDynamicDuotoneMap(blocks);
	}, []);

	// Handle duotone changes
	useEffect(() => {
		if (!duotoneTheme) return;

		// Clean up previous duotone changes
		if (duotoneCleanup.current) {
			duotoneCleanup.current();
			duotoneCleanup.current = null;
		}

		// Apply new duotone changes and store cleanup
		duotoneCleanup.current = replaceDuotoneSVG({
			duotoneTheme,
			dynamicDuotone,
		});
	}, [css, duotoneTheme, dynamicDuotone]);

	const undoChange = useCallback(() => {
		// Revert duotone changes
		if (duotoneCleanup.current) {
			duotoneCleanup.current();
			duotoneCleanup.current = null;
		}

		// Revert CSS changes
		const style = document.getElementById(id);
		if (style && frontStyles.current) {
			style.innerHTML = frontStyles.current;
		}

		// Remove editor CSS
		if (!onEditor) return;
		const iframe = document.querySelector('iframe[name="editor-canvas"]');
		const doc = iframe?.contentDocument || document;
		doc?.getElementById(id)?.remove();
	}, []);

	return { undoChange };
};
