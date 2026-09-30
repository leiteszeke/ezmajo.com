import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

const state = (set) => ({
	visibility: 'minimized', // open | minimized | closed
	queuedTour: null,
	queueTourForRedirect: (tour) => set({ queuedTour: tour }),
	clearQueuedTour: () => set({ queuedTour: null }),
	setVisibility: (visibility) => {
		if (!['open', 'minimized', 'closed'].includes(visibility)) {
			throw new Error('Invalid visibility state');
		}
		set({ visibility });
	},
});

export const useGlobalSyncStore = create(
	persist(devtools(state, { name: 'Extendify Help Center Globals Sync' }), {
		name: `extendify-help-center-globals-sync-${window.extSharedData.siteId}`,
	}),
);
