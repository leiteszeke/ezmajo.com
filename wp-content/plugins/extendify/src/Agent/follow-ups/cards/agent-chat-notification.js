import { notificationSuggestion } from '@agent/lib/notification-suggestion';
import { track } from '@shared/lib/track';
import { __ } from '@wordpress/i18n';

export default {
	id: 'agent-chat-notification',
	follows: '*',
	statuses: ['completed', 'canceled'],
	data: notificationSuggestion,
	score: ({ data }) => (data ? 0.04 : 0),
	content: ({ message, content, ctaLabel, url }) => ({
		title: message,
		body: content,
		action: {
			label:
				ctaLabel ||
				// translators: Button on a card in the AI Agent chat that opens a partner's offer in a new tab.
				__('Learn more', 'extendify-local'),
			url,
		},
	}),
	onView: ({ viewTelemetry }) =>
		track(viewTelemetry.key, viewTelemetry.payload),
	onClick: ({ telemetry }) => track(telemetry.key, telemetry.payload),
};
