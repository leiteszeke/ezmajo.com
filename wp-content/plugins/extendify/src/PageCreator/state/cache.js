import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const usePageDescriptionStore = create(
	persist(
		(set) => ({
			description: null,
			setDescription: (description) => set({ description }),
			reset: () => set({ description: null }),
		}),
		{
			name: `extendify-page-creator-page-description-cache-${window.extSharedData.siteId}`,
		},
	),
);
