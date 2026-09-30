import { UpdateSettingConfirm } from '@agent/workflows/settings/components/UpdateSettingConfirm';
import { __ } from '@wordpress/i18n';

const { abilities } = window.extAgentData;

export const allowedSettings = [
	'posts_per_page',
	'use_smilies',
	'start_of_week',
	'time_format',
	'date_format',
	'title',
	'description',
];
export default {
	available: () => abilities?.canEditSettings,
	id: 'edit-wp-setting',
	whenFinished: { component: UpdateSettingConfirm },
	example: {
		text: __('Change website title', 'extendify-local'),
		agentResponse: {
			// translators: The agent asks this, then waits for the user to type their new site title.
			reply: __(
				'What would you like your new website title to be?',
				'extendify-local',
			),
		},
	},
};
