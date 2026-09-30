import { usePortal } from '@agent/hooks/usePortal';
import { isChangeSiteDesignWorkflowAvailable } from '@agent/lib/util';
import demoFormAssisted from '@agent/workflows/canvas/demo-form-assisted';
import demoFormAssistedModal from '@agent/workflows/canvas/demo-form-assisted-modal';
import demoFormSimple from '@agent/workflows/canvas/demo-form-simple';
import animationWorkflow from '@agent/workflows/theme/change-animation';
import changeSiteDesignWorkflow from '@agent/workflows/theme/change-site-design';
import vibesWorkflow from '@agent/workflows/theme/change-site-vibes';
import fontsWorkflow from '@agent/workflows/theme/change-theme-fonts-variation';
import variationWorkflow from '@agent/workflows/theme/change-theme-variation';
import { createPortal, useEffect, useRef, useState } from '@wordpress/element';
import { __, isRTL } from '@wordpress/i18n';
import { Icon, moreVertical } from '@wordpress/icons';
import { AnimatePresence, motion } from 'framer-motion';

export const OptionsPopover = () => {
	const popoutNode = usePortal('extendify-agent-border-frame-mount');
	const buttonRef = useRef(null);
	const firstButtonRef = useRef(null);
	const [topRight, setTopRight] = useState(null);

	const onOpen = () => {
		if (topRight) return setTopRight(null);
		const rect = buttonRef.current.getBoundingClientRect();
		setTopRight({
			top: rect.bottom + 4,
			right: window.innerWidth - rect.right,
			left: rect.left,
		});
	};
	const onClose = () => {
		setTopRight(null);
		buttonRef.current?.focus();
	};

	useEffect(() => {
		if (!topRight || !firstButtonRef.current) return;
		firstButtonRef.current.focus();
	}, [topRight]);

	useEffect(() => {
		// click away
		const handle = (e) => {
			if (buttonRef.current.contains(e.target)) return;
			if (popoutNode?.contains(e.target)) return;
			setTopRight(null);
		};
		window.addEventListener('click', handle);
		return () => window.removeEventListener('click', handle);
	}, [popoutNode]);

	if (!popoutNode) return null;
	return (
		<>
			{createPortal(
				topRight ? (
					<AnimatePresence>
						<Popover
							position={topRight}
							onClose={onClose}
							firstItemRef={firstButtonRef}
						/>
					</AnimatePresence>
				) : null,
				popoutNode,
			)}
			<button
				ref={buttonRef}
				type="button"
				className="relative z-10 flex justify-center h-6 w-6 items-center border-0 bg-banner-main text-banner-text outline-hidden ring-design-main focus:shadow-none focus:outline-hidden focus-visible:outline-design-main focus:ring-2 hover:opacity-80 rounded-sm"
				onClick={onOpen}
				aria-expanded={topRight ? 'true' : 'false'}
				aria-haspopup="true"
			>
				<Icon
					className="pointer-events-none fill-current leading-none"
					icon={moreVertical}
					size={18}
				/>
				<span className="sr-only">
					{__('View more options', 'extendify-local')}
				</span>
			</button>
		</>
	);
};

const buttons = [
	{
		name: fontsWorkflow.example.text,
		available: fontsWorkflow.available,
		icon: fontsWorkflow.icon,
	},
	{
		name: variationWorkflow.example.text,
		available: variationWorkflow.available,
		icon: variationWorkflow.icon,
	},
	{
		name: vibesWorkflow.example.text,
		available: vibesWorkflow.available,
		icon: vibesWorkflow.icon,
	},
	{
		name: animationWorkflow.example.text,
		available: animationWorkflow.available,
		icon: animationWorkflow.icon,
	},
	...[demoFormAssisted, demoFormAssistedModal, demoFormSimple].map(
		(workflow) => ({
			name: workflow.example.text,
			available: workflow.available,
			icon: workflow.icon,
		}),
	),
	...(isChangeSiteDesignWorkflowAvailable()
		? [
				{
					name: changeSiteDesignWorkflow.example.text,
					available: changeSiteDesignWorkflow.available,
					onSelect: changeSiteDesignWorkflow.onSelect,
					icon: changeSiteDesignWorkflow.icon,
				},
			]
		: []),
];

const Popover = ({ position, onClose, firstItemRef }) => {
	useEffect(() => {
		const handle = (e) => {
			if (e.key === 'Escape') {
				e.preventDefault();
				onClose();
			}
		};
		window.addEventListener('keydown', handle);
		return () => window.removeEventListener('keydown', handle);
	}, [onClose]);

	return (
		<motion.div
			className="fixed w-fit whitespace-nowrap rounded-md bg-white shadow-xl py-2 z-max flex flex-col items-start justify-center gap-1 focus:outline-none border border-gray-300"
			style={{
				top: position.top,
				...(isRTL() ? { left: position.left } : { right: position.right }),
			}}
			initial={{ opacity: 0, scale: 0.95 }}
			animate={{ opacity: 1, scale: 1 }}
			exit={{ opacity: 0, scale: 0.95 }}
			transition={{ duration: 0.2 }}
			onKeyDown={(e) => {
				e.stopPropagation();
				e.preventDefault();
				if (e.key === 'Escape') return onClose();
				const curr = document.activeElement;
				if (e.key === 'ArrowDown' || (e.key === 'Tab' && !e.shiftKey)) {
					if (curr.nextSibling) {
						return curr.nextSibling.focus();
					}
					return firstItemRef.current.focus();
				}
				if (e.key === 'ArrowUp' || (e.key === 'Tab' && e.shiftKey)) {
					if (curr.previousSibling) {
						return curr.previousSibling.focus();
					}
					return curr.parentNode.lastChild.focus();
				}
				if (e.key === 'Enter') {
					return curr.click();
				}
			}}
		>
			{buttons
				.filter(({ available }) => available())
				.map(({ name, icon }, i) => (
					<button
						key={name}
						type="button"
						className="w-full inline-flex gap-0.5 items-center  px-4 py-2 text-sm text-gray-900 text-left hover:bg-gray-100 focus:ring-2 focus:ring-design-main focus:outline-none capitalize"
						ref={i === 0 ? firstItemRef : null}
						role="menuitem"
						onClick={() => {
							window.dispatchEvent(
								new CustomEvent('extendify-agent:chat-submit', {
									detail: { message: name },
								}),
							);
							onClose();
						}}
					>
						{icon ? <Icon icon={icon} /> : null}
						{name}
					</button>
				))}
		</motion.div>
	);
};
