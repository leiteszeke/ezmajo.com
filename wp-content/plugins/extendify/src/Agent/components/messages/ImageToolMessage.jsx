import { useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

const Skipped = () => (
	<div className="flex w-full items-start gap-2.5 px-2.5 py-2">
		<div className="w-7 shrink-0" />
		<div className="flex min-w-0 flex-1 flex-col gap-1">
			<div className="flex items-center gap-2 border-l-4 border-l-wp-notice-neutral bg-gray-50 p-3 text-gray-900">
				<div className="text-sm">
					{__('Image selection skipped', 'extendify-local')}
				</div>
			</div>
		</div>
	</div>
);

const Failed = () => (
	<div className="flex w-full items-start gap-2.5 px-2.5 py-2">
		<div className="w-7 shrink-0" />
		<div className="flex min-w-0 flex-1 flex-col gap-1">
			<div className="flex items-center gap-2 border-l-4 border-l-wp-alert-red bg-wp-notice-error p-3 text-gray-900">
				<div className="text-sm">
					{__("The image couldn't be added", 'extendify-local')}
				</div>
			</div>
		</div>
	</div>
);

// A run that moved past the picker would otherwise render nothing.
export const ImageToolMessage = ({ url, failed }) => {
	const [removed, setRemoved] = useState(false);

	if (!url) return failed ? <Failed /> : <Skipped />;

	if (removed) {
		return (
			<div className="mb-4 ms-2 me-2 flex h-24 w-24 items-center justify-center rounded-lg border border-gray-300 bg-gray-50 p-2 text-center text-xs text-gray-700">
				{__('Image removed', 'extendify-local')}
			</div>
		);
	}

	return (
		<div className="mb-4 ms-2 me-2">
			<img
				className="m-0 h-24 w-auto max-w-full rounded-lg border border-gray-300 object-contain"
				src={url}
				alt={__('Selected image', 'extendify-local')}
				onError={() => setRemoved(true)}
			/>
		</div>
	);
};
