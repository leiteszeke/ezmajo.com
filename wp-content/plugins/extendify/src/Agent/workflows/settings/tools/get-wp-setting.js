import { allowedSettings } from '@agent/workflows/settings/edit-wp-setting';
import apiFetch from '@wordpress/api-fetch';
import { __ } from '@wordpress/i18n';

export default async ({ settingName }) => {
	if (!allowedSettings.includes(settingName)) {
		throw new Error('Setting not allowed');
	}
	const response = await apiFetch({
		path: '/wp/v2/settings?context=edit',
	});

	return {
		oldSettingValue:
			response[settingName] ||
			// translators: No value found message for when a WP setting has no value.
			__('No value found', 'extendify-local'),
	};
};
