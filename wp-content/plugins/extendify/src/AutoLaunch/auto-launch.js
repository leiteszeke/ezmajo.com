import { handleDesign } from '@auto-launch/fetchers/get-design';
import { applyDesign, chooseLogo } from '@auto-launch/functions/design';
import { LaunchPage } from '@auto-launch/LaunchPage';
import { chooseTemplates } from '@auto-launch/templates';
import { createRoot } from '@wordpress/element';
import '@auto-launch/auto-launch.css';

requestAnimationFrame(async () => {
	const launch = document.getElementById('extendify-auto-launch-page');
	if (!launch) return;
	// Before the first paint, or the partner's own colours show and then swap.
	const design = await handleDesign();
	chooseTemplates(design.templates);
	chooseLogo(design.logo);
	applyDesign(launch, design);
	const root = createRoot(launch);
	root.render(<LaunchPage />);
});
