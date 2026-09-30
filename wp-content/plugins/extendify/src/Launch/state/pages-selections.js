import { safeParseJson } from '@shared/lib/parsing';
import { safeLocalStorage } from '@shared/state/safe-local-storage';
import { create } from 'zustand';
import { createJSONStorage, devtools, persist } from 'zustand/middleware';

const initialState = {
	pages: [],
	style: null,
};

const key = `extendify-launch-pages-selection-${window.extSharedData.siteId}`;
const state = (set, get) => ({
	// initialize the state with default values
	...initialState,
	...(safeParseJson(window.localStorage.getItem(key))?.state || {}),
	has(type, item) {
		if (!item?.id) return false;
		return (get()?.[type] ?? [])?.some((t) => t.id === item.id);
	},
	add(type, item) {
		if (get().has(type, item)) return;
		set({ [type]: [...(get()?.[type] ?? []), item] });
	},
	remove(type, item) {
		set({ [type]: get()?.[type]?.filter((t) => t.id !== item.id) });
	},
	removeAll(type) {
		set({ [type]: [] });
	},
	setStyle(style) {
		set({ style });
	},
});

export const usePagesSelectionStore = create(
	persist(devtools(state, { name: 'Extendify Launch Pages Selections' }), {
		name: key,
		storage: createJSONStorage(() => safeLocalStorage),
		skipHydration: true,
	}),
	state,
);
