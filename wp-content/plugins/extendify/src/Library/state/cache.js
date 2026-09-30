import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useCacheStore = create(
	persist(
		(set) => ({
			categories: [],
			setCategories: (categories) => set({ categories }),
		}),
		{ name: `extendify-library-cache-${window.extSharedData.siteId}` },
	),
);
