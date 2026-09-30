import { AssistLandingPage } from '@assist/AssistLandingPage';
import { createRoot, render as renderDeprecated } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import '@assist/assist.css';

const render = (component, node) => {
	if (typeof createRoot !== 'function') {
		renderDeprecated(component, node);
		return;
	}
	createRoot(node).render(component);
};

const init = () => {
	const assistPage = document.getElementById('extendify-assist-landing-page');
	if (!assistPage) return;
	// append skip link to get here
	document
		.querySelector('.screen-reader-shortcut')
		.insertAdjacentHTML(
			'afterend',
			`<a href="#extendify-assist-landing-page" class="screen-reader-shortcut">${__(
				'Skip to Assist',
				'extendify-local',
			)}</a>`,
		);
	render(<AssistLandingPage />, assistPage);
};
init();
