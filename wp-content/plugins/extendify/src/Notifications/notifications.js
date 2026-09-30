import { render } from '@shared/lib/dom';
import domReady from '@wordpress/dom-ready';
import { Notification } from './Notification';
import './notifications.css';

domReady(() => {
	for (const node of document.querySelectorAll('[data-ext-notification]')) {
		const notification = <Notification slot={node.dataset.slot} />;
		render(
			node.hasAttribute('data-admin-notice') ? (
				<div className="mt-10 mr-5">{notification}</div>
			) : (
				notification
			),
			node,
		);
	}
});
