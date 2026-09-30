import { Dialog } from '@headlessui/react';
import { updateOption } from '@library/api/WPApi';
import { ModalContent } from '@library/components/ModalContent';
import { Sidebar } from '@library/components/sidebar/Sidebar';
import { Topbar } from '@library/components/topbar/Topbar';
import { useGlobalsStore } from '@library/state/global';
import { useSiteSettingsStore } from '@library/state/site';
import { useUserStore } from '@library/state/user';
import { insertBlocks } from '@library/util/insert';
import { useActivityStore } from '@shared/state/activity';
import { dispatch, select } from '@wordpress/data';
import { useEffect, useLayoutEffect, useRef } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { motion } from 'framer-motion';

const isNewPage = window?.location?.pathname?.includes('post-new.php');

export const Modal = () => {
	const { incrementActivity } = useActivityStore();
	const { open, setOpen } = useGlobalsStore();
	const { updateUserOption, openOnNewPage } = useUserStore();
	const { category, incrementImports } = useSiteSettingsStore();
	const { createNotice } = dispatch('core/notices');
	const once = useRef(false);

	const onClose = () => setOpen(false);
	const insertPattern = async (blocks) => {
		await insertBlocks(blocks);
		incrementImports();
		onClose();
		createNotice('info', __('Pattern added', 'extendify-local'), {
			isDismissible: true,
			type: 'snackbar',
		});
		// update the general options to reflect the new pattern
		await updateOption('extendify_check_for_image_imports', true);
	};

	useLayoutEffect(() => {
		if (open || once.current) return;
		once.current = true;
		if (openOnNewPage && isNewPage) {
			// Minimize HC if its open
			window.dispatchEvent(new CustomEvent('extendify-hc:minimize'));
			incrementActivity('library-auto-open');
			setOpen(true);
			return;
		}
		const search = new URLSearchParams(window.location.search);
		if (search.has('ext-open')) {
			setOpen(true);
			incrementActivity('library-search-param-auto-open');
		}
	}, [openOnNewPage, setOpen, incrementActivity, open]);

	useEffect(() => {
		const search = new URLSearchParams(window.location.search);

		if (search.has('ext-close')) {
			setOpen(false);
			search.delete('ext-close');
			window.history.replaceState(
				{},
				'',
				`${window.location.pathname}?${search.toString()}`,
			);
		}
	}, [setOpen, incrementActivity]);

	useEffect(() => {
		const handleOpen = () => setOpen(true);
		const handleClose = () => setOpen(false);
		window.addEventListener('extendify::open-library', handleOpen);
		window.addEventListener('extendify::close-library', handleClose);
		return () => {
			window.removeEventListener('extendify::open-library', handleOpen);
			window.removeEventListener('extendify::close-library', handleClose);
		};
	}, [setOpen, open]);

	useEffect(() => {
		if (!open) return;
		const welcomeGuide =
			select('core/edit-post').isFeatureActive('welcomeGuide');
		if (welcomeGuide) {
			dispatch('core/edit-post').toggleFeature('welcomeGuide');
		}
	}, [open]);

	if (!open) return null;

	return (
		<Dialog
			className="extendify-library extendify-library-modal"
			open={open}
			static
			onClose={() => undefined}
		>
			<div className="absolute mx-auto h-full w-full md:p-8 inset-0">
				<div
					className="fixed inset-0 bg-black/30"
					style={{ backdropFilter: 'blur(2px)' }}
					aria-hidden="true"
				/>
				<motion.div
					key="library-modal"
					initial={{ y: 30, opacity: 0 }}
					animate={{ y: 0, opacity: 1 }}
					exit={{ y: 0, opacity: 0 }}
					transition={{ duration: 0.3 }}
					className="relative mx-auto h-full w-full max-w-[1600px] bg-white shadow-2xl sm:flex sm:overflow-hidden"
				>
					<Dialog.Title className="sr-only">
						{__('Design Patterns', 'extendify-local')}
					</Dialog.Title>
					<Sidebar />
					<div className="relative flex w-full flex-col bg-[#FAFAFA]">
						<Topbar
							openOnNewPage={openOnNewPage}
							updateUserOption={updateUserOption}
							onClose={onClose}
						/>
						<div
							id="extendify-library-patterns-list"
							className="relative grow overflow-y-auto"
						>
							<ModalContent insertPattern={insertPattern} category={category} />
						</div>
					</div>
				</motion.div>
			</div>
		</Dialog>
	);
};
