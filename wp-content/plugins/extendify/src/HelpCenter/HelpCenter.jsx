import { Modal } from '@help-center/components/modal/Modal';
import { GuidedTour } from '@help-center/components/tours/GuidedTour';
import { useRouter } from '@help-center/hooks/useRouter';
import { useGlobalSyncStore } from '@help-center/state/globals-sync';
import { useEffect } from '@wordpress/element';
import { AnimatePresence } from 'framer-motion';

export const HelpCenter = () => {
	// register a custom event to hide the Help Center.
	const { setVisibility, visibility } = useGlobalSyncStore();
	const { navigateTo } = useRouter();

	useEffect(() => {
		const handleOpen = (event) => {
			event?.detail?.page && navigateTo(event.detail.page);
			setVisibility('open');
		};
		const handleMinimize = () => {
			if (visibility !== 'open') return;
			setVisibility('minimized');
		};

		window.addEventListener('extendify-hc:open', handleOpen);
		window.addEventListener('extendify-hc:minimize', handleMinimize);
		return () => {
			window.removeEventListener('extendify-hc:open', handleOpen);
			window.removeEventListener('extendify-hc:minimize', handleMinimize);
		};
	}, [setVisibility, visibility, navigateTo]);

	return (
		<>
			<AnimatePresence>
				<Modal />
			</AnimatePresence>
			<GuidedTour />
		</>
	);
};
