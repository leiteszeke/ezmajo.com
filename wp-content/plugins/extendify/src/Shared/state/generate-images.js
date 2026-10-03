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
	},
};
const store = (set, get) => ({
	...startingState,
	...safeParseJson(window.extSharedData?.globalState)?.state,
	updateImageCredits({ remaining, total }) {
		const current = get().imageCredits;
		const next = {
			...current,
			// A reported 0 has to survive the merge.
			...(remaining != null && { remaining }),
			...(total != null && { total }),
		};

		// Every set() costs a WP option write through the persist adapter.
		if (next.remaining === current.remaining && next.total === current.total) {
			return;
		}

		set({ imageCredits: next });
	},
	subtractOneCredit() {
		set((state) => ({
			imageCredits: {
				...state.imageCredits,
				remaining: state.imageCredits.remaining - 1,
			},
		}));
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
