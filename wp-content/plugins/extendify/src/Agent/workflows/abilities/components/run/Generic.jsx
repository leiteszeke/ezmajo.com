import { __ } from '@wordpress/i18n';

export const Generic = ({ inputs, onConfirm, onCancel }) => {
	const run = () => onConfirm?.({ data: inputs ?? {} });

	return (
		<div className="mb-4 ms-2 me-2 flex flex-col rounded-lg border border-gray-300 bg-gray-50">
			<div className="rounded-lg border-b border-gray-300 bg-white p-3">
				<p className="m-0 p-0 text-sm text-gray-900">
					{
						// translators: confirm prompt before the agent performs a WordPress task it picked.
						__('Run this action?', 'extendify-local')
					}
				</p>
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
					onClick={run}
				>
					{__('Confirm', 'extendify-local')}
				</button>
			</div>
		</div>
	);
};
