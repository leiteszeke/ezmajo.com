import apiFetch from '@wordpress/api-fetch';
import { create } from 'zustand';
import { createJSONStorage, devtools, persist } from 'zustand/middleware';

const { siteProfile } = window.extSharedData;

const state = (set) => ({
	siteProfile,
	setSiteProfile(data) {
		set((state) => {
			const updatedProfile = {
				...state.siteProfile,
				...data,
			};
			return { siteProfile: updatedProfile };
		});
	},
	resetState() {
		set({ siteProfile });
	},
});

const path = '/extendify/v1/shared/site-profile';
const storage = {
	getItem: async () => await apiFetch({ path }),
	setItem: async (_name, state) => {
		await apiFetch({
			path,
			method: 'POST',
			data: { siteProfile: JSON.stringify(state) },
		});
	},
};

export const useSiteProfileStore = create(
	persist(devtools(state, { name: 'Extendify Site Profile' }), {
		storage: createJSONStorage(() => storage),
		skipHydration: false,
	}),
	state,
);
