import { Button } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { close } from '@wordpress/icons';

// Modal's built-in dismiss X wraps its Button in a Tooltip, which
// intercepts the click on the live frontend — the X reads as dead.
export const ModalCloseButton = ({ onClick }) => (
	<Button
		size="compact"
		icon={close}
		label={__('Close', 'extendify-local')}
		showTooltip={false}
		onClick={onClick}
	/>
);
