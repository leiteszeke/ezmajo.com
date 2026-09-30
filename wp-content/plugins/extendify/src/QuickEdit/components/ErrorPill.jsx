import { __ } from '@wordpress/i18n';

// Fixed top-right alert reused for every Quick Edit dismissible notice —
// unsupported-block, image-save failures, and the translated-content guard.
export const ErrorPill = ({ message, onDismiss }) => (
	<div
		role="alert"
		className="fixed top-4 right-4 z-[9999] flex items-center gap-2 px-3 py-2 rounded bg-red-100 text-red-700 text-sm shadow"
	>
		<span>{message}</span>
		<button
			type="button"
			aria-label={__('Dismiss', 'extendify-local')}
			className="font-bold opacity-70 hover:opacity-100"
			onClick={onDismiss}
		>
			×
		</button>
	</div>
);
