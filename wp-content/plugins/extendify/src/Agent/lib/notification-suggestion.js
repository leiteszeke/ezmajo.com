import {
	resolveNotificationLink,
	siteHost,
} from '@notifications/notification-link';
import { notificationFor } from '@notifications/selection';

export const AGENT_CHAT_SLOT = 'agent-chat';

export const notificationSuggestion = () => {
	const notification = notificationFor(AGENT_CHAT_SLOT);
	if (!notification) return null;

	const message = notification['content-agent-chat'];
	const { href } = resolveNotificationLink(notification, siteHost());
	if (!message || !href) return null;

	const slug = notification.slug;
	const source = notification.source;

	return {
		id: `notification-${slug}`,
		type: 'external-link',
		message,
		url: href,
		viewTelemetry: {
			key: 'notification_view',
			payload: { slug, slot: AGENT_CHAT_SLOT, source },
		},
		telemetry: {
			key: 'notification_click',
			payload: { slug, slot: AGENT_CHAT_SLOT, source },
		},
	};
};
