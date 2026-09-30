import { demoFormWorkflow } from '@agent/workflows/canvas/components/demo-form-workflow';
import { __ } from '@wordpress/i18n';
import { stack } from '@wordpress/icons';

export default demoFormWorkflow({
	id: 'demo-form-assisted-modal',
	canvas: 'assisted-modal',
	icon: stack,
	// translators: Extendify is the brand name and stays as-is. "assisted modal" names a demo variant showing the chat and the form in one modal.
	text: __('Extendify demo form assisted modal', 'extendify-local'),
});
