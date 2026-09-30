import { AdminBar } from '@help-center/components/buttons/AdminBar';
import { PostEditor } from '@help-center/components/buttons/PostEditor';
import { render } from '@shared/lib/dom';
import { isOnLaunch } from '@shared/lib/utils';
import { useEffect } from '@wordpress/element';
import { registerPlugin } from '@wordpress/plugins';

// Global toolbar
(() => {
	if (isOnLaunch()) return;
	const id = 'wp-admin-bar-help-center-btn';
	if (document.getElementById(id)) return;
	const helpCenter = Object.assign(document.createElement('li'), {
		className: 'extendify-help-center',
		id,
	});
	document.querySelector('#wp-admin-bar-my-account')?.after(helpCenter);
	render(<AdminBar />, helpCenter);
})();

// In editor
registerPlugin('extendify-help-center-buttons', {
	render: () => <HelpCenterButton />,
});
const HelpCenterButton = () => {
	useEffect(() => {
		if (isOnLaunch()) return;
		const id = 'extendify-gtnbrg-help-center-btn';
		if (document.getElementById(id)) return;

		const helpCenter = Object.assign(document.createElement('span'), {
			className: 'extendify-help-center',
			id,
		});
		setTimeout(() => {
			if (document.getElementById(id)) return;
			const page = '[aria-controls="edit-post:document"]';
			const fse = '[aria-controls="edit-site:template"]';
			document.querySelector(page)?.after(helpCenter);
			document.querySelector(fse)?.after(helpCenter);
			render(<PostEditor />, helpCenter);
		}, 500);
	}, []);
	return null;
};
