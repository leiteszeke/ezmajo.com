import { useCallback, useEffect, useRef } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

export const UpdateSettingConfirm = ({ inputs, onConfirm, onCancel }) => {
	const headerRef = useRef(null);
	const oldTitle = useRef('');
	const undoSettingChange = useCallback(() => {
		if (headerRef.current) {
			headerRef.current.textContent = oldTitle.current;
		}
	}, []);

	const confirmed = useRef(false);
	useEffect(() => {
		return () => {
			if (!confirmed.current) undoSettingChange();
		};
	}, []);

	const handleConfirm = () => {
		confirmed.current = true;
		onConfirm({ data: inputs, shouldRefreshPage: true });
	};

	useEffect(() => {
		const header = document.querySelector('.wp-block-site-title');
		if (!headerRef.current && header) {
			headerRef.current = header;
			oldTitle.current = header.textContent ?? '';
		}

		if (!inputs) return;
		const { settingName, newSettingValue } = inputs;

		if (settingName === 'title' && headerRef.current) {
			headerRef.current.textContent = newSettingValue;
		}
	}, [inputs, headerRef]);

	return (
		<div className="mb-4 ms-2 me-2 flex flex-col rounded-lg border border-gray-300 bg-gray-50">
			<div className="rounded-lg border-b border-gray-300 bg-white">
				<div className="p-3">
					<p className="m-0 p-0 text-sm text-gray-900">
						{__('Apply this setting change?', 'extendify-local')}
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
