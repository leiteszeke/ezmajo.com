import { demoFormWorkflow } from '@agent/workflows/canvas/components/demo-form-workflow';
import { __ } from '@wordpress/i18n';
import { sidebar } from '@wordpress/icons';

export default demoFormWorkflow({
	id: 'demo-form-assisted',
	canvas: 'assisted',
	icon: sidebar,
	// translators: Extendify is the brand name and stays as-is. "assisted" names a demo variant where the agent can help fill the form.
	text: __('Extendify demo form assisted', 'extendify-local'),
});
