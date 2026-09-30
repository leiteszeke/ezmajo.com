import { UpdateSiteVisibilityConfirm } from '@agent/workflows/settings/components/UpdateSiteVisibilityConfirm';
import { __ } from '@wordpress/i18n';

const { abilities, agentContext } = window.extAgentData;

// A clicked suggestion skips the backend, so its reply must be written here.
const unpublishExample = {
	text: __('Unpublish my site', 'extendify-local'),
	agentResponse: {
		// translators: Shown when the user clicks the "Unpublish my site" suggestion, above a confirm card.
		reply: __('Ready to take your site back offline?', 'extendify-local'),
		whenFinishedTool: {
			id: 'update-site-visibility',
			labels: {
				// translators: Success notice — the site is now hidden. Not "publishing was canceled".
				confirm: __('Unpublished the site', 'extendify-local'),
				cancel: __('Canceled unpublishing the site', 'extendify-local'),
			},
		},
	},
};

const publishExample = {
	text: __('Publish my site', 'extendify-local'),
	agentResponse: {
		// translators: Shown when the user clicks the "Publish my site" suggestion, above a confirm card.
		reply: __('Ready to make your site live?', 'extendify-local'),
		whenFinishedTool: {
			id: 'update-site-visibility',
			labels: {
				confirm: __('Published the site', 'extendify-local'),
				// translators: Neutral notice — the user backed out, so the site is still hidden.
				cancel: __('Canceled publishing the site', 'extendify-local'),
			},
		},
	},
};

// A hidden site stays eligible with the flag off, or it can never go live.
const inScope = () =>
	Boolean(agentContext?.comingSoonEnabled) || !agentContext?.sitePublished;

export default {
	available: () => Boolean(abilities?.canEditSettings) && inScope(),
	id: 'update-site-visibility',
	whenFinished: { component: UpdateSiteVisibilityConfirm },
	example: agentContext?.sitePublished ? unpublishExample : publishExample,
};
