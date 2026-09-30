import { __ } from '@wordpress/i18n';

export const RedirectFontsVariations = (message) => {
	return (
		<div className="mb-4 ms-2 me-2 flex flex-col rounded-lg border border-gray-300 bg-gray-50">
			<div className="rounded-lg border-b border-gray-300 bg-white p-3">
				<p className="m-0 p-0 text-sm text-gray-900">{message}</p>
			</div>
			<div className="m-0 p-3 text-sm text-gray-900">
				{__('Suggestion:', 'extendify-local')}{' '}
				<a href={`${window.extSharedData.homeUrl}`}>
					{__('Home page', 'extendify-local')}
				</a>
			</div>
		</div>
	);
};
