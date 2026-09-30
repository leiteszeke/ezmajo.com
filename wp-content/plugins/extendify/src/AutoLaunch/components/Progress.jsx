import { loaderSiteCreation } from '@auto-launch/icons';
import { AnimatePresence, motion } from 'framer-motion';

export const StatusMessage = ({ message }) => (
	<div className="overflow-hidden [height:calc(var(--ext-ui-status-size,0.875rem)*1.5)]">
		<AnimatePresence mode="wait">
			{message ? (
				<motion.p
					key={message}
					initial={{ opacity: 0, y: 8 }}
					animate={{ opacity: 1, y: 0 }}
					exit={{ opacity: 0 }}
					transition={{ duration: 0.25 }}
					className="m-0 text-ui-status font-ui-status text-center status-animation"
				>
					{message}
				</motion.p>
			) : null}
		</AnimatePresence>
	</div>
);

export const LoaderGraphic = ({ src }) => {
	if (src) {
		return (
			<img
				src={src}
				alt=""
				className="h-ui-loader w-auto max-w-full rounded-ui-loader object-contain"
			/>
		);
	}

	return (
		<div className="h-ui-loader overflow-hidden rounded-ui-loader [color:var(--ext-ui-loader-color,var(--color-ui-action))] [&>svg]:h-full [&>svg]:w-auto">
			{loaderSiteCreation}
		</div>
	);
};
