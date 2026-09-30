import { Snackbar } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { AnimatePresence, motion } from 'framer-motion';

export const RetryNotice = ({ show }) => {
	if (!show) return null;
	return (
		<AnimatePresence>
			<motion.div className="fixed bottom-[20px] right-0 z-max flex justify-end px-4 pb-4">
				<div className="shadow-2xl">
					<Snackbar>
						{__(
							'Just a moment, this is taking longer than expected.',
							'extendify-local',
						)}
					</Snackbar>
				</div>
			</motion.div>
		</AnimatePresence>
	);
};
