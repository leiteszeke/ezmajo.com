import { UpdateLogoConfirm } from '@agent/workflows/theme/components/UpdateLogoConfirm';
import { __ } from '@wordpress/i18n';

const { abilities } = window.extAgentData;

export default {
	available: () => abilities?.canEditSettings && abilities?.canUploadMedia,
	id: 'update-logo',
	whenFinished: {
		component: UpdateLogoConfirm,
	},
	example: {
		text: __('Change website logo', 'extendify-local'),
		agentResponse: {
			// translators: This message shows above a UI where the user can upload or replace their site logo.
			reply: __(
				'Below you can upload or replace your website logo.',
				'extendify-local',
			),
			whenFinishedTool: {
				id: 'update-logo',
				labels: {
					confirm: __('Updated the site logo', 'extendify-local'),
					cancel: __('Canceled the site logo update', 'extendify-local'),
				},
			},
		},
	},
};
