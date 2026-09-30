import { CheckboxInput } from '@launch/components/CheckboxInput';
import { __ } from '@wordpress/i18n';
import classNames from 'classnames';

export const PageSelectButton = ({
	page,
	previewing,
	onPreview,
	checked,
	onChange,
	forceChecked = false,
}) => (
	<div className="flex items-center rounded-sm overflow-hidden">
		<div
			className={classNames(
				'grow overflow-hidden text-gray-900 border border-gray-300 border-e-0 rounded-s-sm',
				{
					'bg-gray-300': forceChecked,
				},
			)}
		>
			<CheckboxInput
				label={page.name}
				slug={page.slug}
				checked={checked}
				onChange={onChange}
				locked={forceChecked}
			/>
		</div>

		<button
			type="button"
			className={classNames(
				'text-base leading-tight hidden shrink items-center border px-4 py-3 lg:flex overflow-hidden rounded-e-sm',
				{
					'bg-gray-100 text-gray-800 border-gray-300': !previewing,
					'bg-design-main text-white border-design-main': previewing,
				},
			)}
			onClick={onPreview}
		>
			{__('Preview', 'extendify-local')}
		</button>
	</div>
);
