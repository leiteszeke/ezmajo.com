import { useTasksStore } from '@assist/state/tasks';
import apiFetch from '@wordpress/api-fetch';
import { useEffect, useRef, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import classNames from 'classnames';

export const UpdateSiteDescription = ({ popModal, setModalTitle }) => {
	const [siteDescription, setSiteDescription] = useState(undefined);
	const [initialValue, setInitialValue] = useState(undefined);
	const inputRef = useRef();
	const { completeTask } = useTasksStore();

	const submitChange = async () => {
		await apiFetch({
			path: '/wp/v2/settings',
			method: 'POST',
			data: {
				description: siteDescription,
			},
		});
		completeTask('site-description');
		popModal();
	};

	useEffect(() => {
		setModalTitle(__('Add site description', 'extendify-local'));
	}, [setModalTitle]);

	useEffect(() => {
		const controller = new AbortController();

		apiFetch({
			path: '/wp/v2/settings',
			signal: controller.signal,
		}).then((settings) => {
			setSiteDescription(settings.description);
			setInitialValue(settings.description);
		});

		return () => controller.abort();
	}, [setSiteDescription]);

	useEffect(() => {
		inputRef?.current?.focus();
	}, [initialValue]);

	if (typeof siteDescription === 'undefined') {
		return <div className="h-32">{__('Loading...', 'extendify-local')}</div>;
	}

	return (
		<form className="flex flex-col gap-6" onSubmit={(e) => e.preventDefault()}>
			<div>
				<label
					className="mb-1 block text-sm text-gray-900"
					htmlFor="extendify-site-description-input"
				>
					{__('Site description', 'extendify-local')}
				</label>
				<input
					ref={inputRef}
					type="text"
					name="extendify-site-description-input"
					id="extendify-site-description-input"
					className="input-focus h-12 w-96 max-w-full border border-gray-900 px-2"
					autoComplete="off"
					data-1p-ignore
					onChange={(e) => {
						setSiteDescription(e.target.value);
					}}
					value={siteDescription}
					placeholder={__('Enter a site description...', 'extendify-local')}
				/>
			</div>
			<div>
				<button
					type="button"
					disabled={siteDescription === initialValue}
					className={classNames(
						'button-focus relative w-1/5 rounded-sm border-0 bg-design-main px-4 py-3 text-white',
						{
							'cursor-default opacity-50': siteDescription === initialValue,
						},
					)}
					onClick={submitChange}
				>
					{__('Save', 'extendify-local')}
				</button>
			</div>
		</form>
	);
};
