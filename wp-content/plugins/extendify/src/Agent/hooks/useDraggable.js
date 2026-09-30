import { clamp } from '@agent/lib/util';
import { useLayoutEffect, useRef } from '@wordpress/element';

export const useDraggable = ({ el, open, initialPosition, onDragEnd }) => {
	const offset = useRef({ x: 0, y: 0 });
	const pointerIdRef = useRef(null);
	const lastPosition = useRef({
		x: initialPosition.x,
		y: initialPosition.y,
	});

	useLayoutEffect(() => {
		if (!el) return;
		const id = requestAnimationFrame(() => {
			el.style.setProperty('left', `${initialPosition.x}px`, 'important');
			el.style.setProperty('top', `${initialPosition.y}px`, 'important');
		});
		return () => cancelAnimationFrame(id);
	}, [el, initialPosition]);

	useLayoutEffect(() => {
		if (!el || !open) return;

		// keep in bounds
		const minX = 0;
		const minY = 0;
		const maxX = window.innerWidth - el.offsetWidth;
		const maxY = window.innerHeight - el.offsetHeight;
		const left = parseFloat(el.style.left) || 0;
		const top = parseFloat(el.style.top) || 0;
		const x = clamp(left, minX, maxX);
		const y = clamp(top, minY, maxY);

		if (left !== x || top !== y) {
			el.style.setProperty('left', `${x}px`, 'important');
			el.style.setProperty('top', `${y}px`, 'important');
		}
	}, [el, open]);

	useLayoutEffect(() => {
		const bg =
			document.getElementById('wpwrap') ||
			// TODO: is this on all block themes?
			document.querySelector('.wp-site-blocks');
		if (!el || !open || !bg) return;
		const handle = el.querySelector('[data-extendify-agent-handle]');
		if (!(handle instanceof HTMLElement)) return;

		el.style.setProperty('left', `${initialPosition.x}px`, 'important');
		el.style.setProperty('top', `${initialPosition.y}px`, 'important');

		const onPointerDown = (e) => {
			e.preventDefault();
			e.stopPropagation();
			bg.style.pointerEvents = 'none';
			if (pointerIdRef.current !== null) {
				return;
			}
			pointerIdRef.current = e.pointerId;
			handle.setPointerCapture(e.pointerId);
			offset.current = {
				x: e.clientX - el.offsetLeft,
				y: e.clientY - el.offsetTop,
			};
			document.addEventListener('pointermove', onPointerMove);
			document.addEventListener('pointerup', onPointerUp);
		};

		const onPointerMove = (e) => {
			const minX = 0;
			const minY = 0;
			const maxX = window.innerWidth - handle.offsetWidth;
			const maxY = window.innerHeight - handle.offsetHeight;
			const x = clamp(e.clientX - offset.current.x, minX, maxX);
			const y = clamp(e.clientY - offset.current.y, minY, maxY);
			el.style.setProperty('left', `${x}px`, 'important');
			el.style.setProperty('top', `${y}px`, 'important');
			lastPosition.current = { x, y };
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
			onDragEnd(lastPosition.current.x, lastPosition.current.y);
		};

		const onBlur = () => onPointerUp(new PointerEvent('pointerup'));
		const onContextMenu = (e) => {
			e.preventDefault();
			e.stopPropagation();
			return false;
		};

		handle.addEventListener('pointerdown', onPointerDown);
		handle.addEventListener('contextmenu', onContextMenu);
		handle.addEventListener('blur', onBlur);

		return () => {
			handle.removeEventListener('pointerdown', onPointerDown);
			handle.removeEventListener('blur', onBlur);
			handle.removeEventListener('contextmenu', onContextMenu);
			document.removeEventListener('pointermove', onPointerMove);
			document.removeEventListener('pointerup', onPointerUp);
			bg.style.pointerEvents = 'auto';
			if (pointerIdRef.current !== null) {
				handle.releasePointerCapture(pointerIdRef.current);
				pointerIdRef.current = null;
			}
		};
	}, [el, open, initialPosition.x, initialPosition.y, onDragEnd]);
};
