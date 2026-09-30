import { activeCanvasStep, useCanvasStore } from '@agent/state/canvas';
import { steps } from '@agent/workflows/canvas/components/DemoForm';
import { __ } from '@wordpress/i18n';

// Only the step on screen is live, so the fields it offers change per turn.
export const updateDemoForm = {
	name: 'demo-form/update-fields',
	label: __('Filling in the form', 'extendify-local'),
	description:
		'Fill in the fields of the form step the user is on. Its fields are this tool’s inputs.',
	get inputSchema() {
		return activeCanvasStep().inputSchema ?? { type: 'object', properties: {} };
	},
	annotations: { readonly: false },
	execute: (input = {}) => {
		useCanvasStore.getState().writeValues(input);
		return { values: useCanvasStore.getState().values };
	},
};

export const nextDemoFormStep = {
	name: 'demo-form/next-step',
	label: __('Moving to the next step', 'extendify-local'),
	description:
		'Move the form on to its next step. Run this only when the user has asked to move on in so many words, never because the step looks finished.',
	inputSchema: { type: 'object', properties: {} },
	annotations: { readonly: false },
	execute: () => {
		const { activeStep, goToStep } = useCanvasStore.getState();
		if (activeStep >= steps.length - 1) {
			return {
				moved: false,
				reason: 'This is the last step, so the user submits from here.',
			};
		}
		goToStep(activeStep + 1);
		return { moved: true, step: steps[activeStep + 1].title };
	},
};
