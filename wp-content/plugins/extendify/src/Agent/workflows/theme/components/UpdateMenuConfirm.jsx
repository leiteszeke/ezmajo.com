import apiFetch from '@wordpress/api-fetch';
import { useCallback, useEffect, useRef, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

export const UpdateMenuConfirm = ({ inputs, onConfirm, onCancel }) => {
	const [originalMenu, setOriginalMenu] = useState('');
	const { replacements, id } = inputs ?? {};
	const undoMenu = useCallback(() => {
		const nav = document.querySelector(`[data-extendify-menu-id="${id}"]`);
		if (nav && originalMenu) {
			nav.innerHTML = originalMenu;
		}
	}, [id, originalMenu]);

	const confirmed = useRef(false);
	useEffect(() => {
		if (!originalMenu) return;
		return () => {
			if (!confirmed.current) undoMenu();
		};
	}, [originalMenu]);

	const handleConfirm = () => {
		confirmed.current = true;
		onConfirm({ data: inputs });
	};

	useEffect(() => {
		const nav = document.querySelector(`[data-extendify-menu-id="${id}"]`);
		if (!nav) return;

		setOriginalMenu(nav.innerHTML);
		const abortController = new AbortController();

		const fetchAndUpdateMenu = async () => {
			try {
				const html = await apiFetch({
					method: 'POST',
					path: '/extendify/v1/agent/render-navigation',
					data: { content: replacements?.[0]?.updated },
					signal: abortController.signal,
				});
				if (nav && html) nav.innerHTML = html;
			} catch (error) {
				if (error.name !== 'AbortError')
					console.error('Failed to render navigation:', error);
				else throw error;
			}
		};

		void fetchAndUpdateMenu();

		return () => abortController.abort();
	}, [replacements, id, setOriginalMenu]);

	return (
		<div className="mb-4 ms-2 me-2 flex flex-col rounded-lg border border-gray-300 bg-gray-50">
			<div className="rounded-lg border-b border-gray-300 bg-white">
				<div className="p-3">
					<p className="m-0 p-0 text-sm text-gray-900">
						{__(
							'The agent has made the changes in the browser. Please review and confirm.',
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
					{__('Save', 'extendify-local')}
				</button>
			</div>
		</div>
	);
};
