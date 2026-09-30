import { UpdateSiteIconConfirm } from '@agent/workflows/theme/components/UpdateSiteIconConfirm';
import { __ } from '@wordpress/i18n';

const { abilities } = window.extAgentData;

export default {
	available: () => abilities?.canEditSettings && abilities?.canUploadMedia,
	id: 'update-site-icon',
	whenFinished: {
		component: UpdateSiteIconConfirm,
	},
	example: {
		text: __('Change website browser icon', 'extendify-local'),
		agentResponse: {
			// translators: This message shows above a UI where the user can upload or replace their browser icon (favicon).
			reply: __(
				'Below you can upload or replace your website browser icon.',
				'extendify-local',
			),
			whenFinishedTool: {
				id: 'update-site-icon',
				labels: {
					confirm: __('Updated the site icon', 'extendify-local'),
					cancel: __('Canceled the site icon update', 'extendify-local'),
				},
			},
		},
	},
};
