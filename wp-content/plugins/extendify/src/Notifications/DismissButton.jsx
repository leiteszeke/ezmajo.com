import { __ } from '@wordpress/i18n';
import { close, Icon } from '@wordpress/icons';

export const DismissButton = ({ onClick, className, size }) => (
	<button
		type="button"
		aria-label={__('Dismiss notification', 'extendify-local')}
		onClick={onClick}
		className={className}
	>
		<Icon icon={close} size={size} className="fill-current" />
	</button>
);
