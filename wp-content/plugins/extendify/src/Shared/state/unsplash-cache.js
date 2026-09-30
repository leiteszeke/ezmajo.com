import { create } from 'zustand';
import { createJSONStorage, devtools, persist } from 'zustand/middleware';
import { safeLocalStorage } from './safe-local-storage';

const ONE_WEEK_IN_MILLISECONDS = 1000 * 60 * 60 * 24 * 7;

const state = (set, get) => ({
	images: [],
	expiration: 0,
	isEmpty: () => get().images.length === 0,
	hasExpired: () => Date.now() > get().expiration,
	updateCache: (images) =>
		set({ images, expiration: Date.now() + ONE_WEEK_IN_MILLISECONDS }),
});

export const useUnsplashCacheStore = create(
	persist(devtools(state, { name: 'Extendify Unsplash Images' }), {
		name: `extendify-unsplash-images-${window.extSharedData.siteId}`,
		storage: createJSONStorage(() => safeLocalStorage),
	}),
);
