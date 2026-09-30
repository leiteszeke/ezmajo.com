import { useLayoutEffect, useRef, useState } from '@wordpress/element';

export const useIframeScale = ({ viewportWidth }) => {
	const containerRef = useRef(null);
	const [scale, setScale] = useState(1);
	const [contentHeight, setContentHeight] = useState(null);

	useLayoutEffect(() => {
		const el = containerRef.current;
		if (!el) return;
		const obs = new ResizeObserver(([entry]) => {
			setScale(entry.contentRect.width / viewportWidth);
		});
		obs.observe(el);
		return () => obs.disconnect();
	}, []);

	const handleIframeLoad = (e) => {
		const iframeDoc = e.target.contentDocument;
		if (!iframeDoc?.body) return;
		const height = iframeDoc.body.scrollHeight;
		if (height) setContentHeight(height);
	};

	return { containerRef, scale, contentHeight, handleIframeLoad };
};
