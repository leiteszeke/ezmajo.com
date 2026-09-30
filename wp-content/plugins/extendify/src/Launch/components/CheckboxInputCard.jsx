import classNames from 'classnames';

export const CheckboxInputCard = (props) => {
	const { label, description, Icon, checked, ...rest } = props;
	return (
		<label
			className="flex h-full w-full items-center justify-between p-4 font-semibold text-gray-900"
			htmlFor={props.id}
		>
			<div className="flex flex-auto items-center">
				<span className="relative mr-3 inline-block h-5 w-5 align-middle rtl:ml-3 rtl:mr-0">
					<input
						{...rest}
						checked={checked}
						className="m-0 h-5 w-5 rounded-xs"
						type="checkbox"
					/>
					<svg
						className={classNames('absolute inset-0 -mt-px block h-5 w-5', {
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
				<span>
					<span className="text-sm font-medium">{label}</span>
					{description ? (
						<span className="block pr-4 pt-1 font-normal text-gray-700 rtl:pl-4 rtl:pr-0">
							{description}
						</span>
					) : (
						<span />
					)}
				</span>
			</div>
			{Icon && <Icon className="h-6 w-6 flex-none text-design-main" />}
		</label>
	);
};
