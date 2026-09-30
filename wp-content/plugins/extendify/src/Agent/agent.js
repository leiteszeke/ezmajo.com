import { Agent } from '@agent/Agent.jsx';
import { render } from '@shared/lib/dom';
import { isEmbedded } from '@shared/lib/embedded-guard';
import { isOnLaunch } from '@shared/lib/utils';
import domReady from '@wordpress/dom-ready';
import '@agent/agent.css';
import '@agent/buttons';
import { GuidedTour } from '@agent/components/GuidedTour';
import { throwSideConfetti } from './lib/confetti';

domReady(() => {
	// Never activate framed — the Customizer preview, page-builder previews,
	// and the block-editor canvas are all someone else's iframe.
	if (isEmbedded()) return;

	// disableForReducedMotion
	// tours
	const tourId = 'extendify-agent-tour';
	if (document.getElementById(tourId)) return;
	const tour = Object.assign(document.createElement('div'), {
		className: 'extendify-agent-tour',
		id: tourId,
	});
	render(<GuidedTour />, tour);

	const bg =
		// admin area
		document.getElementById('wpwrap') ||
		// TODO: is this on all block themes?
		document.querySelector('.wp-site-blocks');
	if (isOnLaunch() || !bg) return;
	const id = 'extendify-agent-main';
	if (document.getElementById(id)) return;
	const agent = Object.assign(document.createElement('div'), {
		className: 'extendify-agent',
		id,
	});
	document.body.appendChild(agent);
	render(<Agent />, agent);

	// Runs when extendify-launch-success is in the url
	if (window.extAgentData?.startOnboarding) {
		requestAnimationFrame(() => {
			throwSideConfetti();
		});
	}
});
