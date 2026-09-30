import { ConfirmationModal } from '@page-creator/components/ConfirmationModal';
import { PageGen } from '@page-creator/icons/ai-gen';
import { useGlobalsStore } from '@page-creator/state/global';
import { useActivityStore } from '@shared/state/activity';
import { useSelect } from '@wordpress/data';
import { store as editorStore } from '@wordpress/editor';
import { useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { Icon } from '@wordpress/icons';

export const MainButton = () => {
	const { setOpen } = useGlobalsStore();
	const { incrementActivity } = useActivityStore();
	const [confirmationOpen, setConfirmationOpen] = useState(false);
	// Get post attributes using WordPress's useSelect hook
	const isEmptyPage = useSelect(
		(select) => select(editorStore).isEditedPostEmpty(),
		[],
	);

	const handleClick = () => {
		// Minimize HC if its open
		window.dispatchEvent(new CustomEvent('extendify-hc:minimize'));
		if (!isEmptyPage) return setConfirmationOpen(true);

		setOpen(true);
		incrementActivity('page-creator-button-click');
	};

	return (
		<>
			{confirmationOpen && (
				<ConfirmationModal
					setConfirmationOpen={setConfirmationOpen}
					setModalOpen={setOpen}
					confirmationOpen={confirmationOpen}
				/>
			)}
			{/* biome-ignore lint: allow button role here */}
			<div
				role="button"
				onClick={handleClick}
				onKeyDown={(e) => {
					if (!(e.key === 'Enter' || e.key === ' ')) return;
					handleClick();
				}}
				tabIndex={0}
				className="components-button has-icon is-primary ml-3 h-8 min-w-0 cursor-pointer px-2 xs:h-9 sm:ml-2 xl:pr-3"
			>
				<Icon icon={PageGen} size={24} className="fill-none" />
				<span className="ml-1 hidden xl:inline">
					{__('AI Page Generator', 'extendify-local')}
				</span>
			</div>
		</>
	);
};
