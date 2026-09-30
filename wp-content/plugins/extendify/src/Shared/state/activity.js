import { safeParseJson } from '@shared/lib/parsing';
import apiFetch from '@wordpress/api-fetch';
import { create } from 'zustand';
import { createJSONStorage, devtools, persist } from 'zustand/middleware';

const path = '/extendify/v1/shared/activity';

/**
 * Implementation of a custom storage engine for Zustand's persist middleware.
 * It replicates the Storage interface defined at https://developer.mozilla.org/en-US/docs/Web/API/Storage
 *
 * This storage uses a WordPress custom endpoint to persist the state in `wp_options`.
 */
const storage = {
	getItem: () => apiFetch({ path }),
	setItem: (_name, state) =>
		apiFetch({ path, method: 'POST', data: { state } }),
};

const incomingState = safeParseJson(window.extSharedData.activity);

const initialState = {
	actions: {},
};

const state = (set, get) => ({
	...initialState,
	...(incomingState?.state ?? {}),
	incrementActivity: (id) => {
		set((state) => ({
			...state,
			actions: {
				...state.actions,
				[id]: Number(get().actions[id] || 0) + 1,
			},
		}));
	},
});

export const useActivityStore = create(
	persist(devtools(state, { name: 'Extendify Activity' }), {
		name: 'extendify_shared_activity',
		storage: createJSONStorage(() => storage),
		skipHydration: true,
	}),
);
