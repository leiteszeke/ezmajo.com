import { __ } from '@wordpress/i18n';

export const CloseButton = ({ onClose }) => (
	<button
		className="block h-6 w-6 bg-transparent p-px text-inherit outline-hidden focus:shadow-none focus:ring-wp focus:ring-design-main"
		type="button"
		onClick={onClose}
		data-test="modal-close-button"
		aria-label={__('Close', 'extendify-local')}
	>
		<svg
			style={{ fill: 'currentColor' }}
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 24 24"
		>
			<title>{__('Close', 'extendify-local')}</title>
			<path d="M13 11.8l6.1-6.3-1-1-6.1 6.2-6.1-6.2-1 1 6.1 6.3-6.5 6.7 1 1 6.5-6.6 6.5 6.6 1-1z" />
		</svg>
	</button>
);
