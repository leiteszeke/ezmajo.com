import { useCallback } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';

const statusMap = {
	draft: __('Draft'),
	publish: __('Published'),
};

export const UpdatePostStatusConfirm = ({ inputs, onConfirm, onCancel }) => {
	const handleConfirm = () => {
		if (window?.extAgentData?.context) {
			window.extAgentData.context.postStatus = inputs.updatedStatus;
		}
		onConfirm({ data: inputs });
	};

	const handleCancel = useCallback(() => {
		onCancel();
	}, [onCancel]);

	return (
		<div className="mb-4 ms-2 me-2 flex flex-col rounded-lg border border-gray-300 bg-gray-50">
			<div className="rounded-lg border-b border-gray-300 bg-white">
				<div className="p-3">
					<p className="m-0 p-0 text-sm text-gray-900">
						{sprintf(
							// translators: %1$s is the current page or post status, and %2$s is the updated page or post status.
							__(
								'Status will change from "%s" to "%s", please confirm to save.',
								'extendify-local',
							),
							statusMap[inputs.postStatus],
							statusMap[inputs.updatedStatus],
						)}
					</p>
				</div>
			</div>
			<div className="flex justify-start gap-2 p-3">
				<button
					type="button"
					className="w-full rounded-sm border border-gray-500 bg-white p-2 text-sm text-gray-900"
					onClick={handleCancel}
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
