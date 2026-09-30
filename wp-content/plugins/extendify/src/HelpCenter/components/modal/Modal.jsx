import { Dialog, DialogTitle } from '@headlessui/react';
import { MinimizedButton } from '@help-center/components/buttons/MinimizedButton';
import { ModalContent } from '@help-center/components/modal/ModalContent';
import { Topbar } from '@help-center/components/modal/TopBar';
import { useRouter } from '@help-center/hooks/useRouter';
import { useAIChatStore } from '@help-center/state/ai-chat';
import { useGlobalSyncStore } from '@help-center/state/globals-sync';
import { useKnowledgeBaseStore } from '@help-center/state/knowledge-base';
import { useEffect } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { motion } from 'framer-motion';

export const Modal = () => {
	const { visibility } = useGlobalSyncStore();
	const { reset: resetRouterState } = useRouter();
	const { reset: resetKnowledgeBaseState } = useKnowledgeBaseStore();
	const { reset: resetAIChatState } = useAIChatStore();

	useEffect(() => {
		if (visibility === 'closed') {
			resetRouterState();
			resetKnowledgeBaseState();
			resetAIChatState();
		}
	}, [resetAIChatState, resetKnowledgeBaseState, resetRouterState, visibility]);

	if (visibility === 'minimized') {
		return (
			<div className="extendify-help-center">
				<div className="fixed bottom-0 right-0 z-high mx-auto w-[420px] md:m-8 rtl:left-0 rtl:right-auto">
					<MinimizedButton />
				</div>
			</div>
		);
	}

	if (visibility !== 'open') return null;

	return (
		<Dialog
			ref={async () => {
				await Promise.resolve();
				if (!document?.documentElement?.style) return;
				document.documentElement.style.overflow = 'unset';
				document.documentElement.style.paddingRight = 'unset';
			}}
			className="extendify-help-center"
			data-test="help-center-modal"
			open={visibility === 'open'}
			static
			onClose={() => undefined}
		>
			<div
				// TODO: later measure the dashboard height using h-fit and apply that elsewhere
				className="fixed bottom-0 right-0 z-high mx-auto h-full max-h-[589px] w-full max-w-[420px] md:m-8 md:mt-20 rtl:left-0 rtl:right-auto"
			>
				<motion.div
					key="help-center-modal"
					initial={{ y: 6, opacity: 0 }}
					animate={{ y: 0, opacity: 1 }}
					exit={{ y: 0, opacity: 0 }}
					transition={{ duration: 0.2, delay: 0.1 }}
					className="relative mx-auto h-full w-full shadow-2xl-flipped sm:flex sm:overflow-hidden md:rounded-md md:shadow-2xl"
				>
					<DialogTitle className="sr-only">
						{__('Extendify Help Center', 'extendify-local')}
					</DialogTitle>
					<div className="relative flex h-full w-full flex-col rounded-md border border-gray-400 bg-gray-50 md:overflow-hidden">
						<Topbar />
						<div className="grow overflow-y-auto overscroll-contain">
							<ModalContent />
						</div>
					</div>
				</motion.div>
			</div>
		</Dialog>
	);
};
