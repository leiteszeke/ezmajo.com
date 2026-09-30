import { useIsMounted } from '@launch/hooks/useIsMounted';
import {
	useCallback,
	useLayoutEffect,
	useRef,
	useState,
} from '@wordpress/element';
import { debounce } from 'lodash';

const originalHeights = new WeakMap();

export const usePreviewIframe = ({ container, onLoad, ready, loadDelay }) => {
	const isMounted = useIsMounted();
	const [waitForIframe, setWaitForIframe] = useState(0);
	const [iFrame, setIFrame] = useState(null);
	const [maybeOk, setMaybeOk] = useState(false);
	const isUpdating = useRef(false);

	const updateCoverBlocks = useCallback((frame, cntnr) => {
		if (!frame) return;

		const ft = frame.getBoundingClientRect().top;
		const ct = cntnr.getBoundingClientRect().top;
		// If they have scrolled, don't mess with it
		if (ft < ct) return;

		isUpdating.current = true;

		// WP scales the iframe to fit the container
		// Get the scale value from the transform property
		let scale = cntnr
			.querySelector('[style*="scale"]')
			?.style?.transform?.match(/scale\((.*?)\)/)?.[1];
		scale = scale ? parseFloat(scale) : null;
		// Get the height of the container and scale it
		const cntnrHScaled = cntnr.offsetHeight / (scale ?? 1);
		frame.style.setProperty('max-height', `${cntnrHScaled}px`, 'important');

		const coverBlocks =
			frame?.contentDocument?.querySelectorAll('.wp-block-cover');
		for (const el of coverBlocks) {
			if (!originalHeights.has(el)) {
				// Cache the original 'vh' value
				originalHeights.set(el, el.style.minHeight);
			}
			// Reapply the original 'vh' value so it can be used in computations
			el.style.minHeight = originalHeights.get(el);
		}

		for (const el of coverBlocks) {
			if (!frame.contentDocument?.defaultView) return;
			// Get the computed height in px and use it for your calculation
			const computedHeight = parseFloat(
				frame.contentDocument.defaultView.getComputedStyle(el).height,
			);
			el.offsetHeight; // Force a reflow
			el.style.minHeight =
				computedHeight > 784 ? '784px' : `${computedHeight}px`;
		}

		frame.style.setProperty('max-height', 'none', 'important');
		isUpdating.current = false;
	}, []);

	useLayoutEffect(() => {
		if (!ready) return;
		// continuously check for iframe
		const interval = setTimeout(() => {
			const frame = container?.querySelector('iframe[title]');
			// If not found, retry by updating state
			if (!frame) return setWaitForIframe((prev) => prev + 1);
			setIFrame(frame);
			requestAnimationFrame(() => onLoad(frame, container));
		}, 100);
		return () => clearTimeout(interval);
	}, [iFrame, ready, waitForIframe, container, onLoad]);

	useLayoutEffect(() => {
		setMaybeOk(false);
		// After the iFrame is found, wait for it to load
		// Note: using load event is not reliable
		if (!iFrame?.contentDocument) return;

		const observerConfig = {
			attributes: false,
			childList: true,
			subtree: true,
		};

		const loaded = debounce(() => {
			if (!isMounted.current || isUpdating.current) return;
			// Allow the skeleton loader to be removed
			setTimeout(() => setMaybeOk(true), loadDelay);
			updateCoverBlocks(iFrame, container);
		}, 50);

		// Run once in case the iframe is already loaded
		const firstRun = requestAnimationFrame(() => loaded(iFrame, container));
		// Allow only for a max 2s wait time in case the mutation observer gets stuck
		const longestWait = setTimeout(() => {
			if (isMounted.current) {
				m.disconnect();
				loaded();
			}
		}, 2000);
		// Continuously check for changes
		const m = new MutationObserver(loaded);
		m.observe(iFrame.contentDocument, observerConfig);

		return () => {
			cancelAnimationFrame(firstRun);
			clearTimeout(longestWait);
			loaded.cancel();
			m?.disconnect();
		};
	}, [iFrame, container, isMounted, ready, updateCoverBlocks, loadDelay]);

	return { loading: !iFrame, ready: maybeOk };
};
