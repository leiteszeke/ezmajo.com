import { HelpCenter } from '@help-center/HelpCenter';
import { render } from '@shared/lib/dom';
import { isOnLaunch } from '@shared/lib/utils';
import domReady from '@wordpress/dom-ready';
import '@help-center/help-center.css';
import '@help-center/buttons';

const isInsideIframe = () => !!document.querySelector('body.iframe');

domReady(() => {
	if (isOnLaunch() || isInsideIframe()) return;
	const id = 'extendify-help-center-main';
	if (document.getElementById(id)) return;
	const helpCenter = Object.assign(document.createElement('div'), {
		className: 'extendify-help-center',
		id,
	});
	document.body.append(helpCenter);
	render(<HelpCenter />, helpCenter);
});
