import { Dialog, DialogTitle } from '@headlessui/react';
import { Icon } from '@wordpress/components';
import { useEffect, useLayoutEffect, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { close } from '@wordpress/icons';

export const ToolTip = ({ children, title, onClose, anchor }) => {
	const [open, setOpen] = useState(false);
	const [left, setLeft] = useState(0);
	const [top, setTop] = useState(0);
	const onCloseModal = () => {
		setOpen(false);
		onClose?.();
	};

	useLayoutEffect(() => {
		if (!anchor || !open) return;
		// set the anchor's outline to something thick
		const prevOutline = anchor.style.outline;
		anchor.style.outline = '99999px solid rgba(0, 0, 0, 0.4)';
		// find the anchor's center (now only support bottom center)
		const rect = anchor.getBoundingClientRect();
		const x = rect.left + rect.width / 2;
		const y = rect.top + rect.height;
		setLeft(x);
		setTop(y);
		return () => {
			anchor.style.outline = prevOutline;
		};
	}, [anchor, open]);

	useEffect(() => {
		setOpen(true);
	}, [left, top]);

	if (!open) return;
	return (
		<Dialog
			static
			className="extendify-shared"
			open={open}
			onClose={onCloseModal}
		>
			<div className="relative z-max">
				{/* overlay to prevent click through */}
				<div
					onClick={onCloseModal}
					aria-hidden={true}
					role="presentation"
					className="fixed inset-0 z-10 h-screen w-screen bg-transparent"
				/>
				<div
					className="fixed z-20 flex min-w-80 max-w-xs flex-col bg-transparent shadow-2xl"
					style={{
						top: `${top + 12}px`,
						left: `${left}px`,
						transform: 'translate(-50%, 0)',
					}}
				>
					<div className="absolute left-1/2 top-[-12px] h-0 w-0 -translate-x-1/2 transform border-b-[12px] border-l-[8px] border-r-[8px] border-transparent border-b-white" />
					<button
						type="button"
						data-test="close-tooltip"
						className="absolute right-0 top-0 z-20 m-2 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full border-0 bg-white p-0 leading-none outline-hidden ring-1 ring-gray-200 focus:shadow-none focus:ring-wp focus:ring-design-main rtl:left-0 rtl:right-auto"
						onClick={onCloseModal}
						aria-label={__('Close ToolTip', 'extendify-local')}
					>
						<Icon icon={close} className="h-4 w-4 fill-current" />
					</button>
					<DialogTitle className="sr-only">{title}</DialogTitle>
					<div className="text-base relative m-0 bg-white p-6 pt-8 text-left font-sans leading-7 text-gray-900 rtl:text-right">
						{children}
					</div>
				</div>
			</div>
		</Dialog>
	);
};
