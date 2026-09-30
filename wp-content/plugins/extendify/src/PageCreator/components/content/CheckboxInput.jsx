export const CheckboxInput = ({
	label,
	checked,
	onChange,
	slug = 'checkbox-input',
}) => {
	return (
		<label
			htmlFor={slug}
			className="relative flex h-full w-full cursor-pointer items-center justify-between rounded-xs p-2 text-gray-900"
		>
			<div className="flex flex-auto items-center">
				<span className="relative mr-1 inline-block h-4 w-4 align-middle rtl:ml-1 rtl:mr-0">
					<input
						id={slug}
						className="h-4 w-4 rounded-xs focus:ring-0 focus:ring-offset-0"
						type="checkbox"
						onChange={onChange}
						checked={checked}
					/>
					<svg
						className="absolute inset-0 -mt-px block h-4 w-4 text-transparent"
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
				<span className="font-light">{label}</span>
			</div>
		</label>
	);
};
