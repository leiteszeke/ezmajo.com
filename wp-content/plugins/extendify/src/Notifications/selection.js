import { safeParseJson } from '@shared/lib/parsing';
import { ignoresDismissal } from './slots';
import { useNotificationsStore } from './state';

const notificationsOnThisPage = () =>
	safeParseJson(window.extSharedData?.notifications, []);

export const notificationFor = (
	slot,
	notifications = notificationsOnThisPage(),
) => {
	const { isDismissedBanner } = useNotificationsStore.getState();
	return (
		notifications.find(
			(item) =>
				(item?.slots ?? []).includes(slot) &&
				(ignoresDismissal(slot) || !isDismissedBanner(item.slug)),
		) ?? null
	);
};
