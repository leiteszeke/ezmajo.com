import { demoFormWorkflow } from '@agent/workflows/canvas/components/demo-form-workflow';
import { __ } from '@wordpress/i18n';
import { fullscreen } from '@wordpress/icons';

export default demoFormWorkflow({
	id: 'demo-form-simple',
	canvas: 'simple',
	icon: fullscreen,
	// translators: Extendify is the brand name and stays as-is. "simple" names a demo variant showing the form as a plain modal.
	text: __('Extendify demo form simple', 'extendify-local'),
});
