import { safeParseJson } from '@shared/lib/parsing';
import apiFetch from '@wordpress/api-fetch';
import { create } from 'zustand';
import { createJSONStorage, devtools, persist } from 'zustand/middleware';

// Seed from the server so we read-modify-write the full activity list and
// don't clobber what Assist already stored in the same option.
const initialState = {
	activities: [],
	...(safeParseJson(
		window.extAgentData?.userData?.domainsRecommendationsActivities,
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

// Same endpoint/option as Assist so both surfaces feed one list.
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
	persist(devtools(state, { name: 'Extendify Agent Domain Activities' }), {
		storage: createJSONStorage(() => storage),
		skipHydration: true,
	}),
);
