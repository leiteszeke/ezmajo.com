import { AdminBar } from '@agent/components/buttons/AdminBar';
import { Mobile } from '@agent/components/buttons/Mobile';
import { PostEditor } from '@agent/components/buttons/PostEditor';
import { render } from '@shared/lib/dom';
import { isOnLaunch } from '@shared/lib/utils';
import domReady from '@wordpress/dom-ready';
import { useEffect } from '@wordpress/element';
import { registerPlugin } from '@wordpress/plugins';

// TODO: Sometimes the admin bar is crowded, so a smarter way would be to do some analysis first and position these accordingly.

// Global toolbar
domReady(() => {
	if (isOnLaunch()) return;
	const id = 'wp-admin-bar-extendify-agent-btn';
	// Skeleton.php may already own this node; reuse it so the item never moves.
	const agent =
		document.getElementById(id) ??
		Object.assign(document.createElement('li'), {
			className: 'extendify-agent',
			id,
		});
	// Presence no longer proves a mount, so the marker guards it.
	if (agent.dataset.extendifyMounted) return;
	agent.dataset.extendifyMounted = '1';
	agent.style.height = '1.75rem';
	agent.style.marginInlineEnd = '4px';
	if (!agent.isConnected) {
		// TODO: If we want to allow swapping live we need to rethink this
		const loc =
			window.extAgentData.agentPosition === 'floating'
				? '#wp-admin-bar-my-account'
				: '#wp-admin-bar-wp-logo';
		document.querySelector(loc)?.before(agent);
	}
	// Clearing the slot first paints it empty when React commits a task later.
	const mount = agent.appendChild(document.createElement('span'));
	render(<AdminBar />, mount);
});

// Mobile
domReady(() => {
	if (isOnLaunch()) return;
	const id = 'extendify-agent-mobile-btn';
	if (document.getElementById(id)) return;
	const agent = Object.assign(document.createElement('div'), {
		className: 'extendify-agent',
		id,
	});
	agent.style.position = 'sticky';
	agent.style.top = 'calc(100% - var(--extendify-agent-mobile-btn-height))';
	agent.style.bottom = '0';
	// Under the canvas scrim the tap that restores the chat never lands.
	agent.style.zIndex = '999999';
	document.body.appendChild(agent);
	render(<Mobile />, agent);
});

// In editor
registerPlugin('extendify-agent-buttons', {
	render: () => <AgentButton />,
});
const AgentButton = () => {
	useEffect(() => {
		if (isOnLaunch()) return;
		const id = 'extendify-agent-editor-btn';
		if (document.getElementById(id)) return;

		const agent = Object.assign(document.createElement('span'), {
			className: 'extendify-agent',
			id,
		});
		setTimeout(() => {
			if (document.getElementById(id)) return;
			const page = '[aria-controls="edit-post:document"]';
			const fse = '[aria-controls="edit-site:template"]';
			document.querySelector(page)?.after(agent);
			document.querySelector(fse)?.after(agent);
			render(<PostEditor />, agent);
		}, 300);
	}, []);
	return null;
};
