import domReady from '@wordpress/dom-ready';
import '@shared/shared.css';
import { EditPageToolTip } from '@shared/components/EditPageToolTip';
import '@shared/lib/api-fetch';
import { ProductAccountActivation } from '@shared/components/ProductAccountActivation/ProductAccountActivation';
import { render } from '@shared/lib/dom';
import { preFetchImages as preFetchUnsplashImages } from '@shared/lib/unsplash';

const showAIAgents = window.extSharedData.showAIAgents;

const isOnLaunch = () => {
	const query = new URLSearchParams(window.location.search);
	const page = query.get('page');
	return page === 'extendify-launch' || page === 'extendify-auto-launch';
};

domReady(() => {
	if (isOnLaunch()) return;

	preFetchUnsplashImages();

	const urlParams = new URLSearchParams(window.location.search);

	if (!urlParams.has('extendify-launch-success')) return;

	if (window.extSharedData?.showProductActivation?.length) {
		const container = Object.assign(document.createElement('div'), {
			id: 'extendify-product-activation-container',
		});

		document.body.appendChild(container);

		render(<ProductAccountActivation />, container);
	}

	const currentUrl = new URL(window.location.href);
	// Remove the query param so it doesn't show again
	urlParams.delete('extendify-launch-success');
	const newUrl = `${currentUrl.origin}${currentUrl.pathname}`;
	window.history.replaceState({}, '', newUrl);
	// Trigger an event other features can listen to
	// Give time for others to add listeners
	requestAnimationFrame(() => {
		requestAnimationFrame(() => {
			window.dispatchEvent(new CustomEvent('extendify-launch-success'));
			// Open the Agent if not open
			window.dispatchEvent(new CustomEvent('extendify-agent:open'));
		});
	});
	if (showAIAgents) return;
	// This will show the toolbar for users not using AI Agent
	// but are redirected to home
	const homeUrl = new URL(window.extSharedData.homeUrl);
	const isHomePage =
		currentUrl.origin === homeUrl.origin &&
		currentUrl.pathname === homeUrl.pathname;
	if (!isHomePage) return;
	const div = Object.assign(document.createElement('div'), {
		id: 'extendify-edit-page-modal-tooltip',
	});
	document.body.appendChild(div);
	render(<EditPageToolTip />, div);
});
