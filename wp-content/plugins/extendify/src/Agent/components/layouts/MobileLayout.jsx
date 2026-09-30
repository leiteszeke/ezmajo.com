import { useCanvasOpen } from '@agent/components/Canvas';
import { usePortal } from '@agent/hooks/usePortal';
import { useGlobalStore } from '@agent/state/global';
import { createPortal, useEffect } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { chevronDown, Icon } from '@wordpress/icons';
import { AnimatePresence, motion } from 'framer-motion';

export const MobileLayout = ({ children }) => {
	const mountNode = usePortal('extendify-agent-mount');
	const { minimized, setMinimized, open, mode } = useGlobalStore();

	const canvasOpen = useCanvasOpen();

	const minimize = () => setMinimized(true);

	// The full-screen chat would cover the canvas the user just opened.
	useEffect(() => {
		if (canvasOpen) setMinimized(true);
	}, [canvasOpen, setMinimized]);

	useEffect(() => {
		if (!mountNode || minimized) return;
		document.body.style.overflow = 'hidden';
		return () => {
			document.body.style.overflow = '';
		};
	}, [mountNode, minimized]);

	// Only the frontend agent may show while the store says closed.
	if (!mountNode || (!open && mode !== 'docked-left')) return null;

	return createPortal(
		<div
			data-extendify-agent-panel
			className={`fixed inset-0 z-max-1 items-center justify-center ${
				minimized ? 'hidden' : 'flex'
			}`}
			aria-hidden={minimized ? 'true' : 'false'}
		>
			<div className="pointer-events-none absolute inset-0 bg-black/70" />
			<AnimatePresence>
				<motion.div
					key="agent-popout-modal"
					id="extendify-agent-popout-modal"
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ y: 0, opacity: 0 }}
					transition={{ duration: 0.4, delay: 0.1 }}
					className="fixed bottom-[2vh] z-high flex h-full max-h-[80vh] w-full max-w-[90vw] flex-col rounded-lg border border-solid border-gray-600 bg-white shadow-2xl-flipped rtl:left-0 rtl:right-auto"
				>
					<div className="group flex shrink-0 items-center justify-between overflow-hidden rounded-t-[calc(0.5rem-1px)] bg-banner-main text-banner-text">
						<div className="flex h-full grow items-center justify-between gap-1 p-0 py-3">
							<div className="flex h-5 px-4 max-w-36 overflow-hidden">
								<img
									className="max-h-full max-w-full object-contain"
									src={window.extSharedData.partnerLogo}
									alt={window.extSharedData.partnerName}
								/>
							</div>
						</div>
						<button
							type="button"
							className="relative z-10 flex h-full items-center rounded-none border-0 bg-banner-main py-3 pe-4 ps-2 text-banner-text outline-hidden ring-design-main focus:shadow-none focus:outline-hidden focus-visible:outline-design-main"
							onClick={minimize}
						>
							<Icon
								className="pointer-events-none fill-current leading-none"
								icon={chevronDown}
								size={24}
							/>
							<span className="sr-only">
								{__('Minimize window', 'extendify-local')}
							</span>
						</button>
					</div>
					{children}
				</motion.div>
			</AnimatePresence>
		</div>,
		mountNode,
	);
};
