import { safeParseJson } from '@shared/lib/parsing';
import apiFetch from '@wordpress/api-fetch';
import { create } from 'zustand';
import { createJSONStorage, devtools, persist } from 'zustand/middleware';

const path = '/extendify/v1/shared/image-generation';
const storage = {
	getItem: async () => await apiFetch({ path }),
	setItem: async (_name, state) =>
		await apiFetch({ path, method: 'POST', data: { state } }),
};
const startingState = {
	aiImageOptions: {
		prompt: '',
		size: '1024x1024',
	},
	imageCredits: {
		remaining: 10,
		total: 10,
		refresh: undefined,
	},
};
const store = (set) => ({
	...startingState,
	...safeParseJson(window.extSharedData?.globalState)?.state,
	updateImageCredits({ remaining, total, refresh }) {
		set((state) => ({
			imageCredits: {
				...state.imageCredits,
				// Only update truthy values
				...(remaining && { remaining }),
				...(total && { total }),
				...(refresh && { refresh }),
			},
		}));
	},
	subtractOneCredit() {
		set((state) => ({
			imageCredits: {
				...state.imageCredits,
				remaining: state.imageCredits.remaining - 1,
				// set to 24 hours from now (in ms)
				refresh: new Date(Date.now() + 24 * 60 * 60 * 1000).getTime(),
			},
		}));
	},
	resetImageCredits() {
		set({ imageCredits: startingState.imageCredits });
	},
	setAiImageOption(option, value) {
		set((state) => ({
			aiImageOptions: { ...state.aiImageOptions, [option]: value },
		}));
	},
});
const withDevtools = devtools(store, { name: 'Extendify Image Generation' });
const withPersist = persist(withDevtools, {
	name: 'extendify_image_generation',
	storage: createJSONStorage(() => storage),
	skipHydration: true,
	partialize: (state) => {
		// Remove the prompt
		return {
			...state,
			aiImageOptions: { ...state.aiImageOptions, prompt: '' },
		};
	},
});
export const useImageGenerationStore = create(withPersist);
