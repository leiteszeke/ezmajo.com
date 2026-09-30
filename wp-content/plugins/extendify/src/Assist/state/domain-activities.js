import { safeParseJson } from '@shared/lib/parsing';
import apiFetch from '@wordpress/api-fetch';
import { create } from 'zustand';
import { createJSONStorage, devtools, persist } from 'zustand/middleware';

const initialState = {
	activities: [],
	...(safeParseJson(
		window.extAssistData.userData.domainsRecommendationsActivities,
	)?.state ?? {}),
};

const state = (set, get) => ({
	...initialState,
	setDomainActivity: ({
		domain,
		position,
		type = 'primary',
		action = 'clicked',
	}) => {
		set({
			activities: [
				...get().activities,
				{
					domain: domain?.toLowerCase(),
					position,
					type,
					action,
					date: new Date().toISOString(),
				},
			],
		});
	},
});

const debounce = (func, delay) => {
	let timeoutId;
	return (...params) => {
		clearTimeout(timeoutId);
		timeoutId = setTimeout(() => func(...params), delay);
	};
};

const path = '/extendify/v1/assists/domains-recommendations-activities';
const storage = {
	getItem: async () => await apiFetch({ path }),
	setItem: debounce(
		async (_name, state) =>
			await apiFetch({ path, method: 'POST', data: { state } }),
		500,
	),
};

export const useDomainActivities = create(
	persist(
		devtools(state, { name: 'Extendify Domains Recommendations insights' }),
		{
			storage: createJSONStorage(() => storage),
			skipHydration: true,
		},
	),
	state,
);
