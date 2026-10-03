import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const MONTH = 30 * 24 * 60 * 60 * 1000;
export const recent = (at) => Boolean(at) && Date.now() - at < MONTH;

const stamp = (id, fields) => (state) => ({
	cards: { ...state.cards, [id]: { ...state.cards[id], ...fields } },
});

export const useFollowUpHistory = create()(
	persist(
		(set) => ({
			cards: {},
			workflows: {},
			markShown: (id, messageId) =>
				set(stamp(id, { shownAt: Date.now(), shownFor: messageId })),
			markClicked: (id) => set(stamp(id, { clickedAt: Date.now() })),
			markDismissed: (id) => set(stamp(id, { dismissedAt: Date.now() })),
			markDone: (workflowId) =>
				set((state) => ({
					workflows: { ...state.workflows, [workflowId]: Date.now() },
				})),
		}),
		{ name: `extendify-agent-follow-ups-${window.extSharedData.siteId}` },
	),
);
