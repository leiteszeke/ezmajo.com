import { safeLocalStorage } from '@shared/state/safe-local-storage';
import { create } from 'zustand';
import { createJSONStorage, devtools, persist } from 'zustand/middleware';

const state = (set, get) => ({
	progress: [],
	updateSiteAssistTourStatus(taskId) {
		set({ progress: [taskId] });
	},
	finishedTour(tourId) {
		return get().progress.find((tour) => tour === tourId);
	},
});

export const useSiteAssistTourStorage = create(
	persist(devtools(state, { name: 'Extendify Site Assist Tour' }), {
		name: `extendify-site-assist-tour-${window.extSharedData.siteId}`,
		storage: createJSONStorage(() => safeLocalStorage),
	}),
	state,
);
