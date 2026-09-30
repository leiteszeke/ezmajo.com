import { clamp } from '@agent/lib/util';
import { useLayoutEffect, useRef } from '@wordpress/element';

export const useResizable = ({
	el,
	open,
	initialSize,
	onResizeEnd,
	minWidth = 250,
	minHeight = 400,
	maxWidth = 500,
	maxHeight = window.innerHeight,
}) => {
	const start = useRef({ x: 0, y: 0, width: 0, height: 0 });
	const pointerIdRef = useRef(null);

	useLayoutEffect(() => {
		const bg =
			document.getElementById('wpwrap') ||
			// TODO: is this on all block themes?
			document.querySelector('.wp-site-blocks');
		if (!el || !open || !bg) return;

		el.style.width = `${initialSize.width}px`;
		el.style.height = `${initialSize.height}px`;

		const handle = el.querySelector('[data-extendify-agent-resize]');
		if (!(handle instanceof HTMLElement)) return;

		const onPointerDown = (e) => {
			e.preventDefault();
			e.stopPropagation();
			bg.style.pointerEvents = 'none';
			if (pointerIdRef.current !== null) {
				return;
			}
			pointerIdRef.current = e.pointerId;
			handle.setPointerCapture(e.pointerId);
			start.current = {
				x: e.clientX,
				y: e.clientY,
				width: el.offsetWidth,
				height: el.offsetHeight,
			};
			document.addEventListener('pointermove', onPointerMove);
			document.addEventListener('pointerup', onPointerUp);
		};

		const onPointerMove = (e) => {
			const rect = el.getBoundingClientRect();
			const maxAllowedWidth = Math.min(maxWidth, window.innerWidth - rect.left);
			const maxAllowedHeight = Math.min(
				maxHeight,
				window.innerHeight - rect.top,
			);
			const width = clamp(
				start.current.width + (e.clientX - start.current.x),
				minWidth,
				maxAllowedWidth,
			);
			const height = clamp(
				start.current.height + (e.clientY - start.current.y),
				minHeight,
				maxAllowedHeight,
			);
			el.style.width = `${width}px`;
			el.style.height = `${height}px`;
		};

		const onPointerUp = (e) => {
			bg.style.pointerEvents = 'auto';
			if (pointerIdRef.current !== e.pointerId) {
				return;
			}
			pointerIdRef.current = null;
			handle.releasePointerCapture(e.pointerId);
			document.removeEventListener('pointermove', onPointerMove);
			document.removeEventListener('pointerup', onPointerUp);

			const rect = el.getBoundingClientRect();
			const maxAllowedWidth = Math.min(maxWidth, window.innerWidth - rect.left);
			const maxAllowedHeight = Math.min(
				maxHeight,
				window.innerHeight - rect.top,
			);

			const width = clamp(
				start.current.width + (e.clientX - start.current.x),
				minWidth,
				maxAllowedWidth,
			);
			const height = clamp(
				start.current.height + (e.clientY - start.current.y),
				minHeight,
				maxAllowedHeight,
			);
			onResizeEnd(width, height);
		};

		handle.addEventListener('pointerdown', onPointerDown);

		return () => {
			handle.removeEventListener('pointerdown', onPointerDown);
			document.removeEventListener('pointermove', onPointerMove);
			document.removeEventListener('pointerup', onPointerUp);
			bg.style.pointerEvents = 'auto';
			if (pointerIdRef.current !== null) {
				handle.releasePointerCapture(pointerIdRef.current);
				pointerIdRef.current = null;
			}
		};
	}, [
		el,
		open,
		initialSize.width,
		initialSize.height,
		onResizeEnd,
		minWidth,
		minHeight,
		maxWidth,
		maxHeight,
	]);
};
