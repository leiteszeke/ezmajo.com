import { Dialog, DialogTitle } from '@headlessui/react';
import { Topbar } from '@page-creator/components/topbar/Topbar';
import { MainPage } from '@page-creator/pages/MainPage';
import { useGlobalsStore } from '@page-creator/state/global';
import { usePagesStore } from '@page-creator/state/pages';
import { useUserStore } from '@page-creator/state/user';
import { insertBlocks } from '@page-creator/util/insert';
import { useActivityStore } from '@shared/state/activity';
import { dispatch, select, useDispatch, useSelect } from '@wordpress/data';
import { store as editPostStore } from '@wordpress/edit-post';
import { store as editorStore } from '@wordpress/editor';
import { useEffect, useLayoutEffect, useRef } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { motion } from 'framer-motion';

export const Modal = () => {
	const { incrementActivity } = useActivityStore();
	const { open, setOpen } = useGlobalsStore();
	const { updateUserOption, openOnNewPage } = useUserStore();
	const { setPage } = usePagesStore();
	const { resetBlocks } = dispatch('core/block-editor');
	const { closeGeneralSidebar } = useDispatch(editPostStore);

	const renderingModes = useSelect(
		(s) => s('core/preferences').get('core', 'renderingModes') || {},
		[],
	);
	const isTemplateShown =
		renderingModes?.extendable?.page === 'template-locked';
	const { set: setPreference } = useDispatch('core/preferences');

	const setRenderingMode = (mode) =>
		setPreference('core', 'renderingModes', {
			...renderingModes,
			extendable: { ...(renderingModes.extendable || {}), page: mode },
		});

	const { createNotice } = dispatch('core/notices');
	const once = useRef(false);
	const onClose = () => {
		incrementActivity('page-creator-modal-close');
		setOpen(false);
		// Reset the page view back to the dashboard (page 0)
		setPage(0);
	};

	const hasOnlyTopEmptyParagraph = () => {
		const { getBlocks } = select('core/block-editor');
		const blocks = getBlocks();

		return (
			blocks.length === 1 &&
			blocks[0].name === 'core/paragraph' &&
			blocks[0].attributes?.content?.text === ''
		);
	};

	// Get post attributes using WordPress's useSelect hook
	const postAttribute = useSelect((select) => {
		const editor = select(editorStore);

		return {
			isPage: editor.getCurrentPostType() === 'page',
			isNew: editor.isCleanNewPost(),
			isEmptyPost: editor.isEditedPostEmpty(),
		};
	}, []); // Empty dependency array since we want it to update based on store changes

	// Function to handle inserting a new page with the given blocks
	const insertPage = async (blocks, title) => {
		// Close sidebar
		closeGeneralSidebar();

		try {
			if (isTemplateShown) {
				setRenderingMode('post-only');
				// Use raf for a re-render
				await new Promise((resolve) => requestAnimationFrame(resolve));
			}
			// Delete the blocks before we insert our own.
			if (hasOnlyTopEmptyParagraph() || !postAttribute.isEmptyPost)
				resetBlocks([]);

			// Insert the blocks into the editor
			await insertBlocks(blocks);

			// Update the post title
			dispatch('core/editor').editPost({ title });

			// Track the activity of inserting a page
			incrementActivity('page-creator-page-insert');
			// Close the modal/dialog
			onClose();
			// Show a success notification to the user
			createNotice('info', __('Page added', 'extendify-local'), {
				isDismissible: true, // Allow the notice to be dismissed
				type: 'snackbar', // Display as a snackbar-style notification
			});
		} catch (error) {
			console.error('Failed to insert page:', error);
			createNotice('error', __('Failed to add page', 'extendify-local'), {
				isDismissible: true,
				type: 'snackbar',
			});
		} finally {
			// Set back to the previous rendering mode
			if (isTemplateShown) setRenderingMode('template-locked');
		}
	};

	useLayoutEffect(() => {
		if (open || once.current) return;
		once.current = true;

		if (openOnNewPage && postAttribute.isNew) {
			// Minimize HC if its open
			window.dispatchEvent(new CustomEvent('extendify-hc:minimize'));
			// Close library
			window.dispatchEvent(new CustomEvent('extendify::close-library'));
			incrementActivity('page-creator-auto-open');
			setOpen(true);
		}
		const search = new URLSearchParams(window.location.search);
		if (search.has('ext-open-ai-creator')) {
			setOpen(true);
			incrementActivity('page-creator-search-param-auto-open');
		}
	}, [openOnNewPage, setOpen, incrementActivity, open, postAttribute.isNew]);

	useEffect(() => {
		const search = new URLSearchParams(window.location.search);
		const { pathname } = window.location;

		if (search.has('ext-page-creator-close')) {
			setOpen(false);
			search.delete('ext-page-creator-close');
			window.history.replaceState({}, '', `${pathname}?${search.toString()}`);
			incrementActivity('page-creator-search-param-auto-close');
		}

		if (search.has('ext-open')) {
			// Close library
			window.dispatchEvent(new CustomEvent('extendify::open-library'));
			search.delete('ext-open');
			window.history.replaceState({}, '', `${pathname}?${search.toString()}`);
		}
	}, [setOpen, incrementActivity]);

	useEffect(() => {
		const openModal = () => setOpen(true);
		const closeModal = () => setOpen(false);

		window.addEventListener('extendify::open-page-creator', openModal);
		window.addEventListener('extendify::close-page-creator', closeModal);
		return () => {
			window.removeEventListener('extendify::open-page-creator', openModal);
			window.removeEventListener('extendify::close-page-creator', closeModal);
		};
	}, [setOpen]);

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
			className="extendify-page-creator extendify-page-creator-modal"
			open={open}
			static
			aria-labelledby="page-creator-modal"
			role="dialog"
			onClose={() => undefined}
		>
			<div className="mx-auto flex h-full w-full items-center justify-center pt-10 md:p-10 absolute inset-0">
				<div
					onClick={onClose}
					className="fixed inset-0 bg-black/30"
					style={{ backdropFilter: 'blur(2px)' }}
					aria-hidden="true"
				/>
				<motion.div
					key="ai-page-generator-modal"
					initial={{ y: 30, opacity: 0 }}
					animate={{ y: 0, opacity: 1 }}
					exit={{ y: 0, opacity: 0 }}
					transition={{ duration: 0.3 }}
					className="relative mx-auto h-full max-h-full w-full max-w-4xl rounded-lg bg-white shadow-2xl sm:flex sm:overflow-hidden md:h-auto"
				>
					<DialogTitle className="sr-only">
						{__('AI Page Creator', 'extendify-local')}
					</DialogTitle>

					<div className="relative flex w-full flex-col bg-white">
						<Topbar
							openOnNewPage={openOnNewPage}
							updateUserOption={updateUserOption}
							onClose={onClose}
						/>
						<div
							id="extendify-page-creator-pages"
							className="mx-8 grow overflow-y-auto"
						>
							<MainPage insertPage={insertPage} />
						</div>
					</div>
				</motion.div>
			</div>
		</Dialog>
	);
};
