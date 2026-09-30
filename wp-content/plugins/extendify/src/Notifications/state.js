import apiFetch from '@wordpress/api-fetch';
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

const storage = {
	setItem: (_name, store) =>
		apiFetch({
			path: '/extendify/v1/shared/update-user-meta',
			method: 'POST',
			data: {
				option: 'notification_state',
				value: { cards: store.state.cards },
			},
		}),
};

const now = () => new Date().toISOString();

const merge = (cards, slug, changes) => ({
	...cards,
	[slug]: { ...cards[slug], ...changes },
});

const state = (set, get) => ({
	// A per-view log would grow with every admin screen and ship in every page.
	cards: { ...(window.extSharedData?.notificationState?.cards ?? {}) },
	isDismissedBanner: (slug) => Boolean(get().cards[slug]?.dismissedAt),
	dismissBanner: (slug) => {
		if (get().isDismissedBanner(slug)) return;
		set((current) => ({
			cards: merge(current.cards, slug, { dismissedAt: now() }),
		}));
	},
	recordNotificationView: (slug) => {
		set((current) => {
			const card = current.cards[slug];
			return {
				cards: merge(current.cards, slug, {
					views: (card?.views ?? 0) + 1,
					firstSeenAt: card?.firstSeenAt ?? now(),
					lastSeenAt: now(),
				}),
			};
		});
	},
	recordNotificationClick: (slug) => {
		set((current) => {
			const card = current.cards[slug];
			return {
				cards: merge(current.cards, slug, {
					clicks: (card?.clicks ?? 0) + 1,
					firstClickedAt: card?.firstClickedAt ?? now(),
					lastClickedAt: now(),
				}),
			};
		});
	},
});

export const useNotificationsStore = create(
	persist(devtools(state, { name: 'Extendify Notifications' }), {
		name: 'extendify-notifications',
		storage,
		skipHydration: true,
	}),
);
