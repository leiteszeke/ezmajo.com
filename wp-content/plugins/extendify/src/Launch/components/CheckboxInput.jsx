import classNames from 'classnames';

export const CheckboxInput = ({
	label,
	slug,
	checked,
	onChange,
	locked = false,
}) => {
	return (
		<label
			className={classNames(
				'flex items-center px-4 py-3 text-base leading-none',
				{
					'focus-within:text-design-main hover:text-design-main': !locked,
				},
			)}
			htmlFor={slug}
		>
			<span className="flex mr-3 relative rtl:ml-3 rtl:mr-0">
				<input
					id={slug}
					className={classNames(
						'm-0 border rounded-xs before:content-none shadow-none',
						{
							'border-gray-300': !checked || locked,
							'bg-design-main border-design-main': checked && !locked,
						},
					)}
					style={{
						'--color-design-main': locked ? '#BBBBBB' : undefined,
					}}
					disabled={locked}
					type="checkbox"
					onChange={locked ? undefined : onChange}
					checked={locked ? true : checked}
				/>
				<svg
					className={classNames('absolute inset-0 block -mt-px', {
						'text-white': checked,
						'text-transparent': !checked,
					})}
					viewBox="1 0 20 20"
					fill="none"
					xmlns="http://www.w3.org/2000/svg"
					role="presentation"
				>
					<path
						d="M8.72912 13.7449L5.77536 10.7911L4.76953 11.7899L8.72912 15.7495L17.2291 7.24948L16.2304 6.25073L8.72912 13.7449Z"
						fill="currentColor"
					/>
				</svg>
			</span>
			<span className="flex grow flex-col overflow-hidden">
				<span className="truncate text-base font-medium leading-tight">
					{label}
				</span>
			</span>
		</label>
	);
};
