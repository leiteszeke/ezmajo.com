import { __ } from '@wordpress/i18n';

export const UpdateSiteVisibilityConfirm = ({ onConfirm, onCancel }) => {
	// skipAgent resolves no inputs, so the direction comes from the current state.
	const isPublished = Boolean(window.extAgentData?.agentContext?.sitePublished);

	const handleConfirm = () => {
		onConfirm({
			data: { visibility: isPublished ? 'unpublished' : 'published' },
			shouldRefreshPage: true,
		});
	};

	return (
		<div className="mb-4 ms-2 me-2 flex flex-col rounded-lg border border-gray-300 bg-gray-50">
			<div className="rounded-lg border-b border-gray-300 bg-white">
				<div className="p-3">
					<p className="m-0 p-0 text-sm text-gray-900">
						{isPublished
							? __(
									'Your site will be hidden from visitors until you publish it again. Confirm to take it offline.',
									'extendify-local',
								)
							: __(
									'Your site will become visible to everyone. Confirm to take it live.',
									'extendify-local',
								)}
					</p>
				</div>
			</div>
			<div className="flex justify-start gap-2 p-3">
				<button
					type="button"
					className="w-full rounded-sm border border-gray-500 bg-white p-2 text-sm text-gray-900"
					onClick={onCancel}
				>
					{__('Cancel', 'extendify-local')}
				</button>
				<button
					type="button"
					className="w-full rounded-sm border border-design-main bg-design-main p-2 text-sm text-white"
					onClick={handleConfirm}
				>
					{__('Confirm', 'extendify-local')}
				</button>
			</div>
		</div>
	);
};
