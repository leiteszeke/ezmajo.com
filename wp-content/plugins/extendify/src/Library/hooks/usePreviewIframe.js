import { useIsMounted } from '@library/hooks/useIsMounted';
import { useGlobalsStore } from '@library/state/global';
import { requiredCSSVars } from '@library/util/css';
import { hasCSSVar } from '@library/util/dom';
import { useCallback, useEffect, useRef, useState } from '@wordpress/element';
import { debounce } from 'lodash';

const originalHeights = new WeakMap();

export const usePreviewIframe = ({
	container,
	onIFrameLoaded,
	ready,
	loadDelay,
}) => {
	const isMounted = useIsMounted();
	const [waitForIframe, setWaitForIframe] = useState(0);
	const [iFrame, setIFrame] = useState(null);
	const [maybeOk, setMaybeOk] = useState(false);
	const isUpdating = useRef(false);
	const { addMissingCSSVar } = useGlobalsStore();

	const addMissingThemeVars = useCallback(
		(frame) => {
			if (!frame?.contentDocument) return;
			const styles = getComputedStyle(frame.contentDocument.documentElement);
			const styleSheets = frame.contentDocument.styleSheets;
			for (const key in requiredCSSVars) {
				// CSS variable was found applied somewhere
				if (styles.getPropertyValue(key)) continue;
				const varUsed = Array.from(styleSheets)
					.filter((sheet) => {
						try {
							return sheet.cssRules;
						} catch (_error) {
							return false;
						}
					})
					.some((sheet) => hasCSSVar(key, sheet.cssRules));
				// CSS variable was found in a stylesheet somewhere
				if (varUsed) continue;

				// Add the missing variable to the global state to be imported later
				addMissingCSSVar(key);
				// Dive into iframe and add the variables to at the :root scope
				frame.contentDocument.documentElement.style.setProperty(
					key,
					requiredCSSVars[key],
				);
			}
		},
		[addMissingCSSVar],
	);

	const updateCoverBlocks = useCallback(async (frame, cntnr) => {
		const ft = frame.getBoundingClientRect().top;
		const ct = cntnr.getBoundingClientRect().top;
		// If they have scrolled, don't mess with it
		if (ft < ct) return;

		isUpdating.current = true;

		let scale = cntnr
			.querySelector('[style*="scale"]')
			?.style?.transform?.match(/scale\((.*?)\)/)?.[1];
		scale = scale ? parseFloat(scale) : null;

		const cntnrHScaled = cntnr.offsetHeight / (scale ?? 1);
		frame.style.setProperty('max-height', `${cntnrHScaled}px`, 'important');

		const coverBlocks =
			frame.contentDocument.querySelectorAll('.wp-block-cover');
		for (const el of coverBlocks) {
			if (!originalHeights.has(el)) {
				// Cache the original 'vh' value
				originalHeights.set(el, el.style.minHeight);
			}

			// Reapply the original 'vh' value so it can be used in computations
			el.style.minHeight = originalHeights.get(el);
		}

		cntnr.offsetHeight; // Force a reflow
		// Give the browser time to paint
		await new Promise((resolve) => requestAnimationFrame(resolve));
		await new Promise((resolve) => requestAnimationFrame(resolve));

		for (const el of coverBlocks) {
			if (!frame.contentDocument?.defaultView) return;
			// Get the computed height in px and use it for your calculation
			const computedHeight = parseFloat(
				frame.contentDocument.defaultView.getComputedStyle(el).height,
			);
			el.offsetHeight; // Force a reflow
			el.style.minHeight =
				computedHeight > 500 ? '500px' : `${computedHeight}px`;
		}

		frame.style.setProperty('max-height', 'none', 'important');
		isUpdating.current = false;
	}, []);

	useEffect(() => {
		if (!ready) return;
		// continuously check for iframe
		const interval = setTimeout(() => {
			if (iFrame) return;
			const frame = container?.querySelector('iframe[title]');

			// If not found, retry by updating state
			if (!frame) return setWaitForIframe((prev) => prev + 1);
			setIFrame(frame);
			requestAnimationFrame(() => onIFrameLoaded(frame, container));
		}, 100);
		return () => clearTimeout(interval);
	}, [iFrame, ready, waitForIframe, container, onIFrameLoaded]);

	useEffect(() => {
		setMaybeOk(false);
		// After the iFrame is found, wait for it to load
		// Note: using load event is not reliable
		if (!iFrame?.contentDocument) return;

		const config = {
			attributes: false,
			childList: true,
			subtree: true,
		};

		// Run once in case the iframe is already loaded
		requestAnimationFrame(() => loaded(iFrame, container));

		// Continuously check for changes
		const loaded = debounce(async () => {
			if (!isMounted.current || isUpdating.current) return;
			m.disconnect();

			await updateCoverBlocks(iFrame, container);
			if (window.extSharedData.themeSlug !== 'extendable') {
				await addMissingThemeVars(iFrame, container);
			}
			// Reconnect observer after making changes
			setTimeout(() => setMaybeOk(true), loadDelay);
			if (isMounted.current) m.observe(iFrame.contentDocument, config);
		}, 300);

		const m = new MutationObserver(loaded);
		m.observe(iFrame.contentDocument, config);

		return () => {
			loaded.cancel();
			m?.disconnect();
		};
	}, [
		iFrame,
		container,
		isMounted,
		ready,
		updateCoverBlocks,
		addMissingThemeVars,
		loadDelay,
	]);

	return { loading: !iFrame, ready: maybeOk };
};
