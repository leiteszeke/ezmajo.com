import { __ } from '@wordpress/i18n';

export const DismissButton = ({ variant = 'default', onClick }) => {
	const variants = {
		'no-x-spacing': 'py-2 px-0',
		'no-y-spacing': 'py-0 px-2',
		'no-spacing': 'p-0',
		default: 'px-2 py-2',
	};

	return (
		<button
			type="button"
			onClick={onClick}
			className={`${variants[variant]} bg-transparent text-sm text-design-main underline-offset-4 hover:underline`}
		>
			{__('Dismiss', 'extendify-local')}
		</button>
	);
};
