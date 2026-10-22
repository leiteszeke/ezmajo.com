import { UpdateSearchIndexingConfirm } from '@agent/workflows/settings/components/UpdateSearchIndexingConfirm';
import { __ } from '@wordpress/i18n';

const { abilities, agentContext } = window.extAgentData;

const enableExample = {
	text: __('Enable search engine indexing', 'extendify-local'),
	agentResponse: {
		// translators: Shown when the user clicks the "Enable search engine indexing" suggestion, above a confirm card.
		reply: __('Ready to let search engines find your site?', 'extendify-local'),
		whenFinishedTool: {
			id: 'update-search-indexing',
			inputs: { indexing: 'enabled' },
			labels: {
				confirm: __('Enabled search engine indexing', 'extendify-local'),
				// translators: Neutral notice — the user backed out, so search engines are still discouraged.
				cancel: __(
					'Canceled enabling search engine indexing',
					'extendify-local',
				),
			},
		},
	},
};

const disableExample = {
	text: __('Stop search engines indexing my site', 'extendify-local'),
	agentResponse: {
		// translators: Shown when the user clicks the "Stop search engines indexing my site" suggestion, above a confirm card.
		reply: __(
			'Ready to ask search engines not to index your site?',
			'extendify-local',
		),
		whenFinishedTool: {
			id: 'update-search-indexing',
			inputs: { indexing: 'disabled' },
			labels: {
				confirm: __(
					'Asked search engines not to index the site',
					'extendify-local',
				),
				cancel: __(
					'Canceled discouraging search engine indexing',
					'extendify-local',
				),
			},
		},
	},
};

// A blocked site stays eligible with the flag off, or it can never be indexed.
const inScope = () =>
	Boolean(agentContext?.searchEngineBlockEnabled) ||
	Boolean(agentContext?.searchEnginesBlocked);

export default {
	available: () => Boolean(abilities?.canEditSettings) && inScope(),
	id: 'update-search-indexing',
	whenFinished: { component: UpdateSearchIndexingConfirm },
	example: agentContext?.searchEnginesBlocked ? enableExample : disableExample,
};
