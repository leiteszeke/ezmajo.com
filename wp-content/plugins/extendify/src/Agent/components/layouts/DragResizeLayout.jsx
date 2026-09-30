import { useCanvasOpen } from '@agent/components/Canvas';
import { useDraggable } from '@agent/hooks/useDraggable';
import { usePortal } from '@agent/hooks/usePortal';
import { useResizable } from '@agent/hooks/useResizable';
import { useGlobalStore } from '@agent/state/global';
import { usePositionStore } from '@agent/state/position';
import {
	createPortal,
	useCallback,
	useEffect,
	useState,
} from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { close, Icon } from '@wordpress/icons';
import { AnimatePresence, motion } from 'framer-motion';

// TODO: some of the bound checking isn't working that well.
// For example, the user shrinks the height of the browser.
// On reload this should at least put the window in bounds.
// Maybe a resize observer would be useful.

export const DragResizeLayout = ({ children }) => {
	const [el, setEl] = useState(null);
	const mountNode = usePortal('extendify-agent-mount');
	const { open, setOpen } = useGlobalStore();

	// So it will re-render the hooks when mounted
	const ref = useCallback(
		(node) => requestAnimationFrame(() => setEl(node)),
		[],
	);
	useDraggable({
		el,
		open,
		initialPosition: usePositionStore.getState(),
		onDragEnd: (x, y) => {
			usePositionStore.getState().setPosition(x, y);
			// External contract: no in-repo listener by design — emitted for
			// host-page/analytics consumers (mirrors the consumed :resize-end below).
			window.dispatchEvent(
				new CustomEvent('extendify-agent:drag-end', { detail: { x, y } }),
			);
		},
	});
	useResizable({
		el,
		open,
		initialSize: usePositionStore.getState(),
		onResizeEnd: (width, height) => {
			usePositionStore.setState({ width, height });
			window.dispatchEvent(
				new CustomEvent('extendify-agent:resize-end', {
					detail: { width, height },
				}),
			);
		},
	});

	useEffect(() => {
		if (!el || !open) return;
		// If it's not intersecting, close it
		const observer = new IntersectionObserver((entries) => {
			if (!entries[0].isIntersecting) setOpen(false);
		});
		observer.observe(el);
		return () => observer.disconnect();
	}, [el, open, setOpen]);

	const canvasOpen = useCanvasOpen();

	const closeAgent = () => {
		setOpen(false);
		// External contract: no in-repo listener by design — notifies
		// host-page/analytics consumers the user dismissed the agent.
		window.dispatchEvent(new CustomEvent('extendify-agent:closed-button'));
	};

	if (!mountNode || !open) return null;

	return createPortal(
		<AnimatePresence>
			<motion.div
				key="agent-popout-modal"
				id="extendify-agent-popout-modal"
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				exit={{ y: 0, opacity: 0 }}
				transition={{ duration: 0.4, delay: 0.1 }}
				className="fixed bottom-0 right-0 z-higher flex max-h-full max-w-full flex-col rounded-lg border border-solid border-gray-300 bg-white shadow-2xl-flipped rtl:left-0 rtl:right-auto"
				ref={ref}
			>
				<div className="group flex shrink-0 items-center justify-between overflow-hidden rounded-t-[calc(0.5rem-1px)] bg-banner-main text-banner-text">
					<div
						data-extendify-agent-handle
						draggable
						className="flex h-full grow cursor-grab active:cursor-grabbing select-none items-center justify-between gap-1 p-0 py-3"
					>
						<div className="flex h-5 px-4 max-w-36 overflow-hidden">
							<img
								className="max-h-full max-w-full object-contain"
								src={window.extSharedData.partnerLogo}
								alt={window.extSharedData.partnerName}
							/>
						</div>
						<div className="opacity-0 transition-opacity duration-300 group-hover:opacity-100">
							<DragButton />
						</div>
					</div>
					{/* Only hidden: removing it shifts the drag handle to the edge. */}
					<button
						type="button"
						className={`relative z-10 flex h-full items-center rounded-none border-0 bg-banner-main py-3 pe-4 ps-2 text-banner-text outline-hidden ring-design-main focus:shadow-none focus:outline-hidden focus-visible:outline-design-main ${canvasOpen ? 'invisible' : ''}`}
						onClick={closeAgent}
					>
						<Icon
							className="pointer-events-none fill-current leading-none"
							icon={close}
							size={18}
						/>
						<span className="sr-only">
							{__('Close window', 'extendify-local')}
						</span>
					</button>
				</div>
				{children}
				<div
					data-extendify-agent-resize
					className="absolute -bottom-2 -right-2 z-high h-6 w-6 group"
				>
					<div className="h-6 w-6 cursor-se-resize group-active:cursor-nwse-resize" />
				</div>
			</motion.div>
		</AnimatePresence>,
		mountNode,
	);
};

const DragButton = (props) => {
	return (
		<div style={{ userSelect: 'none' }} className="relative flex" {...props}>
			<Icon
				className="pointer-events-none text-banner-text"
				icon={
					<svg
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 24 24"
						width="24"
						height="24"
						className="pointer-events-none"
						aria-hidden="true"
						focusable="false"
					>
						{/* hardcoded to use currentColor */}
						<path
							fill="currentColor"
							d="M8 7h2V5H8v2zm0 6h2v-2H8v2zm0 6h2v-2H8v2zm6-14v2h2V5h-2zm0 8h2v-2h-2v2zm0 6h2v-2h-2v2z"
						></path>
					</svg>
				}
				size={24}
			/>
			<span className="sr-only">{__('Drag to move', 'extendify-local')}</span>
		</div>
	);
};
