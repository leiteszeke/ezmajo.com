import { safeParseJson } from '@shared/lib/parsing';
import apiFetch from '@wordpress/api-fetch';
import { create } from 'zustand';
import { createJSONStorage, devtools, persist } from 'zustand/middleware';

const key = 'extendify-assist-globals';
const startingState = {
	dismissedNotices: [],
	dismissedBanners: [],
	modals: [],
	showConfetti: true,
	// domains suggestion key
	domainsCacheKey: 'first-run',
	// initialize the state with default values
	...(safeParseJson(window.extAssistData.userData.globalData)?.state ?? {}),
};

const state = (set, get) => ({
	...startingState,
	isDismissedBanner(id) {
		return get().dismissedBanners.some((banner) => banner.id === id);
	},
	dismissBanner(id) {
		if (get().isDismissedBanner(id)) return;
		const banner = { id, dismissedAt: new Date().toISOString() };
		set((state) => ({
			dismissedBanners: [...state.dismissedBanners, banner],
		}));
	},
	dismissConfetti() {
		set({ showConfetti: false });
	},
	pushModal(modal) {
		set((state) => ({ modals: [modal, ...state.modals] }));
	},
	popModal() {
		set((state) => ({ modals: state.modals.slice(1) }));
	},
	clearModals() {
		set({ modals: [] });
	},
	updateDomainsCacheKey() {
		set(() => ({ domainsCacheKey: Date.now() }));
	},
});

const path = '/extendify/v1/assist/global-data';
const storage = {
	getItem: async () => await apiFetch({ path }),
	setItem: async (_name, state) =>
		await apiFetch({ path, method: 'POST', data: { state } }),
};

export const useGlobalStore = create(
	persist(devtools(state, { name: 'Extendify Assist Globals' }), {
		name: key,
		storage: createJSONStorage(() => storage),
		skipHydration: true,
		partialize: (state) => {
			delete state.modals;
			return state;
		},
	}),
);
