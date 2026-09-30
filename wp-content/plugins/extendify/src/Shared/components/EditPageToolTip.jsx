import { __ } from '@wordpress/i18n';
import '@shared/shared.css';
import { ToolTip } from '@shared/components/ToolTip';

export const EditPageToolTip = () => {
	return (
		<ToolTip
			title={__('Tooltip pointing to the edit page button', 'extendify-local')}
			anchor={document.querySelector('#wp-admin-bar-edit')}
		>
			{__(
				"Welcome to your new site! When you're ready, press here to edit this page.",
				'extendify-local',
			)}
		</ToolTip>
	);
};
