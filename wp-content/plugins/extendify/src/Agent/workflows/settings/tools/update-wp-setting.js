import { allowedSettings } from '@agent/workflows/settings/edit-wp-setting';
import apiFetch from '@wordpress/api-fetch';

export default async ({ settingName, newSettingValue }) => {
	if (!allowedSettings.includes(settingName)) {
		throw new Error('Setting not allowed');
	}
	return await apiFetch({
		path: '/wp/v2/settings?context=edit',
		method: 'POST',
		data: { [settingName]: newSettingValue },
	});
};
