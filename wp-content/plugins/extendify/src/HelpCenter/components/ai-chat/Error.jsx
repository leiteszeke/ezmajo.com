import { __ } from '@wordpress/i18n';

export const ErrorMessage = ({ text, reset }) => {
	return (
		<div className="rounded-lg border border-solid border-red-500 bg-red-100 p-5">
			<p className="m-0 mb-4 text-sm text-gray-800">{text}</p>
			{reset && (
				<p className="m-0">
					<button
						type="button"
						className="border-none bg-transparent p-0 underline"
						onClick={reset}
					>
						{__('Please try again.', 'extendify-local')}
					</button>
				</p>
			)}
		</div>
	);
};
