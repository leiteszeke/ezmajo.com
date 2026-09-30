// Onboarding extends this file. Giving it a whenFinished component of its own
// is what a step beyond change-site-design's design picker would hang off.
import changeSiteDesignWorkflow from '@agent/workflows/theme/change-site-design';
import { __ } from '@wordpress/i18n';

export default {
	...changeSiteDesignWorkflow,
	id: 'start-onboarding',
	// Launch clears the chat, so an empty one means nobody has been greeted yet.
	available: () =>
		!window.extAgentData?.chatHistory?.length &&
		changeSiteDesignWorkflow.available(),
	example: {
		...changeSiteDesignWorkflow.example,
		// Sent hidden, so it never renders and never needs translating.
		text: 'Start onboarding',
		agentResponse: {
			...changeSiteDesignWorkflow.example.agentResponse,
			// translators: this is the initial message in the agent chat, welcoming the user. Keep it short and friendly and follow the same markdown format and emoji.
			reply: __(
				'#### Your site is ready 🎉\nWant to explore other website designs?',
				'extendify-local',
			),
		},
	},
};
