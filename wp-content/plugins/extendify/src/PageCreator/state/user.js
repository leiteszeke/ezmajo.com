import { safeParseJson } from '@shared/lib/parsing';
import apiFetch from '@wordpress/api-fetch';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

const storage = {
	getItem: async () => await apiFetch({ path: '/wp/v2/users/me' }),
	setItem: async (_name, value) =>
		await apiFetch({
			path: '/wp/v2/users/me',
			method: 'PUT',
			data: { extendify_page_creator_user: value },
		}),
};

export const useUserStore = create(
	persist(
		(set, get) => ({
			openOnNewPage: true,
			allowsInstallingPlugins: true,
			updateUserOption: (key, value) => {
				if (!Object.keys(get()).includes(key)) return;
				set({ [key]: value });
			},
			...(safeParseJson(window.extPageCreator?.userInfo)?.state ?? {}),
		}),
		{
			name: 'extendify_page_creator_user',
			storage: createJSONStorage(() => storage),
			partialize: (state) => ({ ...state, ready: false }),
			skipHydration: true,
		},
	),
);
