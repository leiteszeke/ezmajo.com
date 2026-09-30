import { usePortal } from '@agent/hooks/usePortal';
import { blockCodeQueryArgs } from '@agent/lib/block-code';
import { findBlockEl, scopeOf } from '@agent/lib/block-el';
import { useWorkflowStore } from '@agent/state/workflows';
import { whenAnimationsSettle } from '@quick-edit/lib/after-animations';
import { MEDIA_RING, needsContrastRing } from '@quick-edit/lib/over-media';
import { useQuickEditStore } from '@quick-edit/state/store';
import apiFetch from '@wordpress/api-fetch';
import {
	createPortal,
	useCallback,
	useEffect,
	useRef,
	useState,
} from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { close, Icon } from '@wordpress/icons';
import { addQueryArgs } from '@wordpress/url';
import classNames from 'classnames';
import { motion } from 'framer-motion';

const MIN_OUTLINE_SIZE = 10;

// Render-only after the selector unification: `agentBlock` is set
// by Quick Edit's Ask AI flow (or future workflows), and this component
// draws the outline + X-close indicator. Hover-bar owns hover + click
// selection on the live page; DOMHighlighter no longer listens for either.
export const DOMHighlighter = ({ busy = false, working = false }) => {
	const [rect, setRect] = useState(null);
	const [ringNeeded, setRingNeeded] = useState(false);
	const mountNode = usePortal('extendify-agent-dom-mount');
	const el = useRef(null);
	const { getWorkflowsByFeature } = useWorkflowStore();
	const block = useQuickEditStore((s) => s.agentBlock);
	const setBlock = useQuickEditStore((s) => s.setAgentBlock);
	const setBlockCode = useQuickEditStore((s) => s.setAgentBlockCode);
	const enabled = getWorkflowsByFeature({ requires: ['block'] })?.length > 0;

	const clearBlock = useCallback(() => {
		setBlock(null);
		setRect(null);
		el.current = null;
	}, [setBlock, setRect]);

	useEffect(() => {
		if (!block?.id) return;
		const ac = new AbortController();
		const queryArgs = blockCodeQueryArgs(
			block,
			window.extAgentData?.context?.postId,
		);
		if (!queryArgs) return;

		const isAlive = { current: true };
		(async () => {
			const res = await apiFetch({
				path: addQueryArgs(`extendify/v1/agent/get-block-code`, queryArgs),
				signal: ac.signal,
			}).catch(() => ({})); // Agent will get it later if fails
			if (!res.block || !isAlive.current || ac.signal.aborted) return;
			setBlockCode(res.block);
		})();
		return () => {
			ac.abort();
			isAlive.current = false;
		};
	}, [setBlockCode, block]);

	// Re-syncs the rect for programmatic block changes (e.g. Ask AI)
	// and after the wp-site-blocks open/close transform settles.
	useEffect(() => {
		if (!block?.id) return;
		const match = findBlockEl(block.id, document, scopeOf(block));
		if (!match) return;
		el.current = match;
		setRingNeeded(needsContrastRing(match));

		const measure = () => {
			const r = match.getBoundingClientRect();
			if (r.width <= 0 || r.height <= 0) return;
			setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
		};
		measure();

		// transitionend covers the panel-open/close transform; the
		// timeouts are belt-and-braces if transitions are disabled.
		const wsb = document.querySelector('.wp-site-blocks');
		const onTransitionEnd = (e) => {
			if (e.propertyName === 'transform') measure();
		};
		wsb?.addEventListener('transitionend', onTransitionEnd);
		const t1 = window.setTimeout(measure, 80);
		const t2 = window.setTimeout(measure, 360);
		const dropSettle = whenAnimationsSettle(match, measure);

		return () => {
			wsb?.removeEventListener('transitionend', onTransitionEnd);
			window.clearTimeout(t1);
			window.clearTimeout(t2);
			dropSettle();
		};
	}, [block]);

	// The chip's X clears the block without firing the event.
	useEffect(() => {
		if (block?.id) return;
		setRect(null);
		el.current = null;
	}, [block]);

	useEffect(() => {
		const handle = () => {
			setRect(null);
			el.current = null;
		};
		window.addEventListener('extendify-agent:remove-block-highlight', handle);
		return () =>
			window.removeEventListener(
				'extendify-agent:remove-block-highlight',
				handle,
			);
	}, []);

	useEffect(() => {
		if (!block?.id) return;
		const handle = () => {
			const match = findBlockEl(block.id, document, scopeOf(block));
			// Clearing only the rect leaves the chip counting a gone node.
			if (!match) {
				clearBlock();
				return;
			}
			el.current = match;
			const r = match.getBoundingClientRect();
			if (r.width <= 0 || r.height <= 0) return;
			setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
		};
		window.addEventListener('extendify-agent:refresh-block-highlight', handle);
		return () =>
			window.removeEventListener(
				'extendify-agent:refresh-block-highlight',
				handle,
			);
	}, [block, clearBlock]);

	// Use capture phase for `scroll` so we hear it on any scrollable
	// ancestor (e.g. wp-site-blocks when something repositions it as
	// the page scroll container). Bubble-phase `scroll` doesn't
	// propagate, so a window-only listener misses those.
	useEffect(() => {
		const onScrollOrResize = () => {
			if (!el.current) return;
			const { top, left, width, height } = el.current.getBoundingClientRect();
			// Animating this re-targets the spring mid-scroll, so it never lands.
			setRect({ top, left, width, height, instant: true });
		};
		window.addEventListener('scroll', onScrollOrResize, {
			passive: true,
			capture: true,
		});
		window.addEventListener('resize', onScrollOrResize);
		return () => {
			window.removeEventListener('scroll', onScrollOrResize, {
				capture: true,
			});
			window.removeEventListener('resize', onScrollOrResize);
		};
	}, [el]);

	useEffect(() => {
		if (!el.current) return;

		const resizeObserver = new ResizeObserver(() => {
			if (!el.current) return;
			const { top, left, width, height } = el.current.getBoundingClientRect();
			// A detached node reports 0x0, which draws as a corner dot.
			if (width <= 0 || height <= 0) return;
			setRect({ top, left, width, height });
		});

		resizeObserver.observe(el.current);

		return () => {
			resizeObserver.disconnect();
		};
	}, [el.current]);

	// ResizeObserver misses a replaced node and an ancestor reflow, so the
	// outline stays on the old box.
	useEffect(() => {
		if (!block?.id) return;
		const root = document.querySelector('.wp-site-blocks');
		if (!root) return;

		let rafId = 0;
		const observer = new MutationObserver(() => {
			if (rafId) return;
			rafId = window.requestAnimationFrame(() => {
				rafId = 0;
				const match = findBlockEl(block.id, document, scopeOf(block));
				if (!match) return;
				el.current = match;
				const r = match.getBoundingClientRect();
				if (r.width <= 0 || r.height <= 0) return;
				setRect({
					top: r.top,
					left: r.left,
					width: r.width,
					height: r.height,
				});
			});
		});
		observer.observe(root, {
			childList: true,
			subtree: true,
			characterData: true,
		});
		return () => {
			observer.disconnect();
			if (rafId) window.cancelAnimationFrame(rafId);
		};
	}, [block]);

	useEffect(() => {
		if (!enabled) return;
		const root = document.querySelector('.wp-site-blocks');
		if (!root) return;
		root.classList.add('extendify-agent-highlighter-mode');
		return () => root.classList.remove('extendify-agent-highlighter-mode');
	}, [enabled]);

	useEffect(() => {
		if (!busy) return;
		const root = document.querySelector('.wp-site-blocks');
		if (!root) return;
		root.classList.add('extendify-agent-busy');
		return () => root.classList.remove('extendify-agent-busy');
	}, [busy]);

	useEffect(() => {
		if (!working) return;
		const root = document.querySelector('.wp-site-blocks');
		if (!root) return;
		root.classList.add('extendify-agent-working');
		return () => root.classList.remove('extendify-agent-working');
	}, [working]);

	if (!enabled || !rect || !mountNode) return null;

	const { top, left, width, height, instant } = rect;
	// A separator's box is sub-pixel tall; 4px dashes read as a broken line.
	const framed = (size) => Math.max(size, MIN_OUTLINE_SIZE);
	const animate = {
		x: left - (framed(width) - width) / 2,
		y: top - (framed(height) - height) / 2,
		width: framed(width),
		height: framed(height),
		opacity: 1,
	};
	const transition = instant
		? { duration: 0 }
		: {
				type: 'spring',
				stiffness: 700,
				damping: 40,
				mass: 0.25,
			};
	return createPortal(
		<>
			{block && !busy ? (
				// biome-ignore lint: Using <button> is complicated with unknown themes
				<div
					role="button"
					className={classNames(
						'fixed z-9 h-6 w-6 -translate-y-3.5 cursor-pointer select-none flex items-center justify-center rounded-full text-center font-bold',
						{ 'ring-1 ring-white/20': ringNeeded },
					)}
					tabIndex={0}
					onClick={clearBlock}
					onKeyDown={clearBlock}
					style={{
						top,
						left: width / 2 + left - 12,
						backgroundColor: 'var(--wp--preset--color--primary, red)',
						color: 'var(--wp--preset--color--background, white)',
					}}
				>
					<Icon
						className="pointer-events-none fill-current leading-none"
						icon={close}
						size={18}
					/>
					<span className="sr-only">
						{__('Remove highlight', 'extendify-local')}
					</span>
				</div>
			) : null}
			<motion.div
				initial={false}
				aria-hidden
				animate={animate}
				transition={transition}
				className="fixed z-8 outline-dashed outline-4"
				style={{
					top: 0,
					left: 0,
					willChange: 'transform,width,height,opacity',
					outlineColor: 'var(--wp--preset--color--primary, red)',
					boxShadow: ringNeeded ? MEDIA_RING : undefined,
					// This mount sits outside the scroller; 'auto' eats page scroll.
					pointerEvents: 'none',
				}}
			/>
		</>,
		mountNode,
	);
};
