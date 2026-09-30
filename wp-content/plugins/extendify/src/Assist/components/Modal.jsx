import { useGlobalStore } from '@assist/state/globals';
import { Dialog, DialogTitle } from '@headlessui/react';
import { Button } from '@wordpress/components';
import { useEffect, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { close, Icon } from '@wordpress/icons';

export const Modal = () => {
	const { modals, popModal } = useGlobalStore();
	const ModalContent = modals[0];
	const [title, setTitle] = useState('');

	useEffect(() => {
		if (!modals[0]) setTitle('');
	}, [modals]);

	return (
		<Dialog
			as="div"
			className="extendify-assist"
			open={modals.length > 0}
			onClose={popModal}
		>
			<div className="fixed top-0 z-high mx-auto h-full w-full items-center justify-center overflow-hidden p-2 md:flex md:p-6">
				<div
					className="fixed inset-0 bg-black/40 transition-opacity"
					aria-hidden="true"
				/>
				<div className="relative mx-auto flex flex-col rounded-xs bg-white shadow-2xl sm:flex sm:min-w-md sm:overflow-hidden">
					<div className="flex items-center justify-between">
						<DialogTitle className="m-0 px-6 text-base text-gray-900">
							{title}
						</DialogTitle>
						<Button
							className="m-4 border-0"
							onClick={popModal}
							icon={<Icon icon={close} size={24} />}
							label={__('Close Modal', 'extendify-local')}
							showTooltip={false}
						/>
					</div>
					<div className="relative m-0 p-6 pt-0 text-left">
						{modals?.length > 0 && (
							<ModalContent popModal={popModal} setModalTitle={setTitle} />
						)}
					</div>
				</div>
			</div>
		</Dialog>
	);
};
