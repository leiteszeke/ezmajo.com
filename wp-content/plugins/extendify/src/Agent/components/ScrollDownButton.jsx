import { __ } from '@wordpress/i18n';
import { arrowDown, Icon } from '@wordpress/icons';
import { AnimatePresence, motion } from 'framer-motion';

export const ScrollDownButton = ({ canScrollDown, onClick }) => {
	return (
		<div className="pointer-events-none sticky bottom-1 flex h-8 items-center justify-center">
			<AnimatePresence>
				{canScrollDown ? (
					<motion.button
						key="scroll-down"
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						transition={{ duration: 0.2, exit: { duration: 0 } }}
						onClick={onClick}
						type="button"
						className="pointer-events-auto flex h-fit items-center justify-center gap-2 whitespace-nowrap rounded-full border border-gray-500 bg-white/90 p-1 text-sm font-medium text-design-main shadow-lg transition-colors hover:bg-gray-100 focus-visible:ring-design-main disabled:pointer-events-none"
					>
						<Icon fill="currentColor" icon={arrowDown} size={20} />
						<span className="sr-only">
							{__('Scroll down', 'extendify-local')}
						</span>
					</motion.button>
				) : null}
			</AnimatePresence>
		</div>
	);
};
