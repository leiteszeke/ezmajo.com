import { canvasView } from '@agent/lib/canvas-views';
import { DemoForm } from '@agent/workflows/canvas/components/DemoForm';
import {
	nextDemoFormStep,
	updateDemoForm,
} from '@agent/workflows/canvas/components/demo-form-tools';
import { __ } from '@wordpress/i18n';

// Views that dim the chat can't deliver on an offer to help fill the form.
const reply = (canvas) =>
	canvasView(canvas)?.assist
		? // translators: The agent has just opened a three-step form the user fills in.
			__(
				"I've opened the demo form for you to fill out. There are three steps. Feel free to ask me any questions or if you need help filling it out.",
				'extendify-local',
			)
		: // translators: The agent has just opened a three-step form the user fills in.
			__(
				"I've opened the demo form for you to fill out. There are three steps.",
				'extendify-local',
			);

export const demoFormWorkflow = ({ id, canvas, icon, text }) => ({
	// Nothing to save, so partners never see it.
	available: () => Boolean(window.extSharedData.devbuild),
	id,
	icon,
	abilities: [
		'extendify/site-info',
		'extendify/content-list',
		'extendify/content-search',
		'extendify/content-read',
		'extendify/options',
		'extendify/taxonomies',
		'extendify/media',
		'extendify/navigation',
		'extendify/theme-settings',
		updateDemoForm,
		nextDemoFormStep,
	],
	whenFinished: { component: DemoForm, canvas },
	example: {
		text,
		agentResponse: {
			reply: reply(canvas),
			// The three share a tool id: one form, and only assisted reaches the backend.
			whenFinishedTool: {
				id: 'demo-form',
				labels: {
					confirm: __('Submitted the demo form', 'extendify-local'),
					cancel: __('Closed the demo form', 'extendify-local'),
				},
			},
		},
	},
});
