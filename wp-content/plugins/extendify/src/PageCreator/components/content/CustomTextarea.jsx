import { Description, Field, Label, Textarea } from '@headlessui/react';
import { Button } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { close, Icon } from '@wordpress/icons';

export const CustomTextarea = ({
	placeholder,
	className,
	title,
	onChange,
	value,
	description = null,
	required = false,
	hideEditor = false,
	setHideEditor = () => {},
	id,
}) => {
	const handleEditClick = (e) => {
		e.preventDefault();
		setHideEditor(false);
	};

	return (
		<Field id={id} className="p-3">
			<Label
				as="h4"
				className="mb-2 mt-0 text-base font-medium data-[disabled]:opacity-50"
			>
				{__(title, 'extendify-local')}{' '}
				{required && (
					<span className="text-sm font-light text-wp-alert-red">*</span>
				)}
			</Label>

			{description && (
				<Description className="data-[disabled]:opacity-50">
					{__(description, 'extendify-local')}
				</Description>
			)}
			{hideEditor ? (
				<div>
					<span className="line-clamp-4 opacity-80">{value}</span>
					<span className="link mt-1 flex w-full justify-end">
						<Button variant="link" onClick={handleEditClick}>
							{__('Edit', 'extendify-local')}
						</Button>
					</span>
				</div>
			) : (
				<div className="relative">
					<Textarea
						name="description"
						placeholder={placeholder}
						value={value}
						onChange={onChange}
						className={className}
					/>
					{value ? (
						<span className="absolute right-0 top-0 z-10 flex items-center pr-2 pt-2">
							<button
								type="button"
								className="m-0 border-0 bg-transparent p-0 text-gray-500"
								aria-label={__('Clear', 'extendify-local')}
								onClick={() => {
									onChange({ currentTarget: { value: '' } });
								}}
							>
								<Icon icon={close} size={16} />
							</button>
						</span>
					) : null}
				</div>
			)}
		</Field>
	);
};
