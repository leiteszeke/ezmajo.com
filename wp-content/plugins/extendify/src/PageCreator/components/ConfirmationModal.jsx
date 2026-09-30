import { useActivityStore } from '@shared/state/activity';
import { Button, Modal as Dialog } from '@wordpress/components';
import { __ } from '@wordpress/i18n';

const { adminUrl } = window.extSharedData;

export const ConfirmationModal = ({
	setConfirmationOpen,
	confirmationOpen,
	setModalOpen,
}) => {
	const { incrementActivity } = useActivityStore();

	const confirmDeletion = () => {
		setConfirmationOpen(false);
		setModalOpen(true);
		incrementActivity('page-creator-delete-content-button-click');
	};

	return (
		<Dialog
			onRequestClose={() => setConfirmationOpen(false)}
			className="extendify-page-creator"
			size="medium"
			aria-labelledby="page-creator-confirmation"
			role="dialog"
			isOpen={confirmationOpen}
			title={__('Confirmation', 'extendify-local')}
		>
			<div className="flex flex-col space-y-6 text-sm">
				<div>
					{__(
						'Do you want to replace existing content or create a new page?',
						'extendify-local',
					)}
				</div>
				<div className="flex w-full items-center justify-end space-x-2">
					<Button size="default" variant="tertiary" onClick={confirmDeletion}>
						{__('Delete existing content', 'extendify-local')}
					</Button>
					<Button
						variant="primary"
						size="default"
						href={`${adminUrl}post-new.php?post_type=page&ext-open-ai-creator=1`}
						target="_blank"
					>
						{__('Create a new page', 'extendify-local')}
					</Button>
				</div>
			</div>
		</Dialog>
	);
};
