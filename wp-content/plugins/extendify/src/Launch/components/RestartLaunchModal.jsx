import { Dialog } from '@headlessui/react';
import { updateOption } from '@launch/api/WPApi';
import { useUserSelectionStore } from '@launch/state/user-selections';
import apiFetch from '@wordpress/api-fetch';
import { Spinner } from '@wordpress/components';
import { forwardRef, useEffect, useRef, useState } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import classnames from 'classnames';
import { AnimatePresence, motion } from 'framer-motion';

export const RestartLaunchModal = ({ setPage }) => {
	const oldPages = window.extOnbData.resetSiteInformation.pagesIds ?? [];
	const oldNavigations =
		window.extOnbData.resetSiteInformation.navigationsIds ?? [];
	const templatePartsIds =
		window.extOnbData.resetSiteInformation.templatePartsIds ?? [];
	const pageWithTitleTemplateId =
		window.extOnbData.resetSiteInformation.pageWithTitleTemplateId ?? '';
	const globalStylesPostID = window.extSharedData.globalStylesPostID;

	const { resetState } = useUserSelectionStore();
	const [open, setOpen] = useState(false);
	const [processing, setProcessing] = useState(false);
	const initialFocus = useRef(null);
	const handleExit = () => {
		window.location.href = `${window.extSharedData.adminUrl}admin.php?page=extendify-assist`;
	};

	const handleOk = async () => {
		setProcessing(true);
		resetState();
		for (const pageId of oldPages) {
			try {
				await apiFetch({
					path: `/wp/v2/pages/${pageId}`,
					method: 'DELETE',
				});
			} catch (responseError) {
				console.warn(
					`delete pages failed to delete a page (id: ${pageId}) with the following error`,
					responseError,
				);
			}
		}
		// They could be posts
		for (const pageId of oldPages) {
			try {
				await apiFetch({
					path: `/wp/v2/posts/${pageId}`,
					method: 'DELETE',
				});
			} catch (responseError) {
				console.warn(
					`delete posts failed to delete a page (id: ${pageId}) with the following error`,
					responseError,
				);
			}
		}
		// delete the wp_navigation posts created by Launch
		for (const navigationId of oldNavigations) {
			try {
				await apiFetch({
					path: `/wp/v2/navigation/${navigationId}`,
					method: 'DELETE',
				});
			} catch (responseError) {
				console.warn(
					`delete navigation failed to delete a navigation (id: ${navigationId}) with the following error`,
					responseError,
				);
			}
		}

		for (const template of templatePartsIds) {
			try {
				await apiFetch({
					path: `/wp/v2/template-parts/${template}?force=true`,
					method: 'DELETE',
				});
			} catch (responseError) {
				console.warn(
					`delete template failed to delete template (id: ${template}) with the following error`,
					responseError,
				);
			}
		}

		try {
			await apiFetch({
				path: `/wp/v2/templates/${pageWithTitleTemplateId}?force=true`,
				method: 'DELETE',
			});
		} catch (responseError) {
			console.warn('Failed to delete page-with-title template:', responseError);
		}

		// Reset global styles
		try {
			await apiFetch({
				path: `/wp/v2/global-styles/${globalStylesPostID}`,
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					settings: {},
					styles: {},
				}),
			});
		} catch (styleResetError) {
			console.warn(
				'Failed to reset global styles with the following error:',
				styleResetError,
			);
		}

		// Reset animation settings to none
		try {
			await updateOption('extendify_animation_settings', {
				type: 'none',
				speed: 'medium',
			});
		} catch (animationResetError) {
			console.warn(
				'Failed to reset animation settings with the following error:',
				animationResetError,
			);
		}

		setOpen(false);
		window.location.reload();
	};

	useEffect(() => {
		if (oldPages.length > 0) {
			setOpen(true);
			setPage(0);
		}
	}, [oldPages.length, setOpen, setPage]);

	return (
		<AnimatePresence>
			{open && (
				<Dialog
					initialFocus={initialFocus}
					static
					open={open}
					as={motion.div}
					initial={false}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
					data-test="confirmation-launch"
					className="extendify-launch extendify-launch-modal"
					onClose={() => null}
				>
					<div className="absolute top-0 mx-auto flex h-screen w-full items-center justify-center md:p-8">
						<div
							className="fixed inset-0 bg-black/30"
							style={{ backdropFilter: 'blur(2px)', zIndex: 99999 }}
							aria-hidden="true"
						/>
						<div
							style={{ zIndex: 99999 + 100 }}
							className="relative mx-6 max-w-[1600px] rounded-sm bg-white shadow-2xl sm:flex sm:overflow-hidden"
						>
							<Dialog.Panel className="flex flex-col">
								<Dialog.Title className="m-0 flex items-center py-6 pl-8 pr-7 text-2xl font-bold text-gray-900">
									{__('Start over?', 'extendify-local')}
								</Dialog.Title>
								<div className="relative max-w-[600px] px-8 py-0 text-left font-normal rtl:text-right">
									<p className="m-0 mb-2 p-0 text-base">
										{__(
											'Go through the AI website creation process again to create a new site.',
											'extendify-local',
										)}
									</p>
									<p className="m-0 mb-2 p-0 text-base">
										<strong>
											{sprintf(
												// translators: %3$s is the number of old pages
												__(
													'%s pages/posts created in the prior onboarding session will be deleted.',
													'extendify-local',
												),
												oldPages.length,
											)}
										</strong>
									</p>
								</div>
								<div className="flex justify-end gap-2 px-8 py-8 text-base">
									<NavigationButton
										data-test="modal-exit-button"
										onClick={handleExit}
										disabled={processing}
										className="border-gray-200 bg-white text-design-main hover:bg-gray-50 focus:bg-gray-50"
									>
										{__('Exit', 'extendify-local')}
									</NavigationButton>
									<NavigationButton
										onClick={handleOk}
										disabled={processing}
										className="border-design-main bg-design-main text-design-text"
										data-test="modal-continue-button"
									>
										{!processing ? (
											__('Delete and start over', 'extendify-local')
										) : (
											<div className="flex items-center justify-center">
												<Spinner />
												<div>{__('Processing', 'extendify-local')}</div>
											</div>
										)}
									</NavigationButton>
								</div>
							</Dialog.Panel>
						</div>
					</div>
				</Dialog>
			)}
		</AnimatePresence>
	);
};

const NavigationButton = forwardRef((props, ref) => {
	return (
		<button
			ref={ref}
			{...props}
			className={classnames(
				'button-focus flex items-center rounded-sm border px-6 py-3 leading-6',
				{
					'opacity-50': props.disabled,
				},
				props.className,
			)}
			type="button"
		>
			{props.children}
		</button>
	);
});
