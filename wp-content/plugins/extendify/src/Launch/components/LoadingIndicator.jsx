import { __ } from '@wordpress/i18n';

export const LoadingIndicator = () => (
	<p className="w-full text-center text-base text-gray-700">
		{__('Loading...', 'extendify-local')}
	</p>
);
