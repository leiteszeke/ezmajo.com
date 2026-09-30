import { CanvasPane, DOT_GRID } from '@agent/components/Canvas';
import { usePortal } from '@agent/hooks/usePortal';
import { createPortal } from '@wordpress/element';
import { motion } from 'framer-motion';

const CHAT_WIDTH = 384;
const MODAL_SIZE = {
	width: 1024,
	height: 720,
	maxWidth: 'calc(100vw - 8rem)',
	maxHeight: 'calc(100vh - 8rem)',
};

// The canvas owns the scrim and the close control, so this only clears the scrim.
export const CanvasModalLayout = ({ children }) => {
	const mountNode = usePortal('extendify-agent-canvas-modal-mount');

	if (!mountNode) return null;

	return createPortal(
		<div className="pointer-events-none fixed inset-0 z-[100001] overflow-auto">
			<div className="pointer-events-auto flex min-h-full items-center justify-center px-4 py-8">
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					transition={{ duration: 0.3, ease: 'easeInOut' }}
					className="relative flex overflow-hidden rounded-2xl bg-gray-50 p-2 shadow-lg"
					style={{ ...DOT_GRID, ...MODAL_SIZE }}
				>
					<div
						className="relative z-10 flex h-full shrink-0 flex-col overflow-hidden rounded-2xl bg-white shadow-lg"
						style={{ width: CHAT_WIDTH }}
					>
						<div className="flex shrink-0 items-center bg-banner-main px-4 py-2.5 text-banner-text">
							<div className="flex h-5 max-w-36 overflow-hidden">
								<img
									className="max-h-full max-w-full object-contain"
									src={window.extSharedData.partnerLogo}
									alt={window.extSharedData.partnerName}
								/>
							</div>
						</div>
						{children}
					</div>
					<CanvasPane seat="modal" />
				</motion.div>
			</div>
		</div>,
		mountNode,
	);
};
