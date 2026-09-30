import {
	getDesignBuildShape,
	getHomeShape,
	getImagesShape,
	getLaunchDecisionsShape,
	getLogoShape,
	getPagesShape,
	getPluginsShape,
	getProfileShape,
	getStringsShape,
	getStyleShape,
} from '@auto-launch/fetchers/shape';
import { clearSiteImages } from '@auto-launch/functions/wp';
import { launchStrings } from '@auto-launch/strings';
import { siteImageUrls } from '@shared/lib/site-images';
import { safeLocalStorage } from '@shared/state/safe-local-storage';
import { create } from 'zustand';
import { createJSONStorage, devtools, persist } from 'zustand/middleware';
import { overrideWithUrlParams, urlParams, urlParamsShape } from './url-params';

const shapeToKeyValue = (shape) => {
	return Object.fromEntries(
		Object.keys(shape.shape).map((key) => [key, undefined]),
	);
};

const initialState = {
	go: false,
	showExtendifyCodeScreen: false,
	// translators: this is for a action log UI. Keep it short
	statusMessages: [launchStrings().statusBooting],
	errorMessage: null,
	errorCount: 0,
	title: null,
	description: null,
	descriptionBackup: undefined,
	descriptionRaw: null,
	urlParams: {},
	siteProfile: {
		...shapeToKeyValue(getProfileShape),
	},
	launchDecisions: {
		...shapeToKeyValue(getLaunchDecisionsShape),
	},
	...shapeToKeyValue(getLogoShape),
	...shapeToKeyValue(getPluginsShape),
	...shapeToKeyValue(getStyleShape),
	...shapeToKeyValue(getStringsShape),
	...shapeToKeyValue(getImagesShape),
	...shapeToKeyValue(getHomeShape),
	...shapeToKeyValue(getPagesShape),
	...shapeToKeyValue(getDesignBuildShape),
	designBuild: undefined,
	attempt: 1,
};

const state = (set, get) => ({
	...initialState,
	urlParams: {
		...initialState.urlParams,
		...urlParams,
	},
	title: undefined,
	description: undefined,
	descriptionBackup: undefined,
	descriptionRaw: undefined,
	setData: (key, value) => {
		if (!isValidKey(key)) return;
		if (get()[key] === value) return; // avoid unnecessary updates
		set({ [key]: value });
	},
	addStatusMessage: (message) => {
		const currentMessages = get().statusMessages;
		// remove any previous duplicates
		const prev = currentMessages.filter((msg) => msg !== message);
		set({ statusMessages: [...prev, message] });
	},
	setErrorMessage: (message) => {
		set((state) => ({
			errorMessage: message,
			errorCount: state.errorCount + 1,
		}));
	},
	needToStall: () => get().errorCount > 6,
	resetErrorCount: () => {
		set({ errorCount: 0 });
	},
	reset: ({ exclude }) => {
		const newState = { ...initialState, attempt: get().attempt + 1 };
		if (exclude && Array.isArray(exclude)) {
			exclude.forEach((key) => {
				if (!isValidKey(key)) return;
				newState[key] = get()[key];
			});
		}
		clearSiteImages().catch(() => null);
		set(newState);
	},
});

// Checks that a key being set is actually something we expect
const isValidKey = (key) => Object.keys(initialState).includes(key);

const keySchemas = {
	urlParams: urlParamsShape,
	siteProfile: getProfileShape,
	launchDecisions: getLaunchDecisionsShape,
	...Object.fromEntries(
		[
			getLogoShape,
			getPluginsShape,
			getStyleShape,
			getStringsShape,
			getImagesShape,
			getHomeShape,
			getPagesShape,
			getDesignBuildShape,
		].flatMap((s) => Object.entries(s.shape)),
	),
};

export const useLaunchDataStore = create(
	persist(devtools(state, { name: 'Extendify Launch Data' }), {
		name: `extendify-launch-data-${window.extSharedData.siteId}`,
		storage: createJSONStorage(() => safeLocalStorage),
		merge: (p, current) => {
			// Make sure the persisted state is valid and not corrupted.
			const persisted = p && typeof p === 'object' ? p : {};

			// This gives us some recovery on page reload
			const validated = Object.fromEntries(
				Object.entries(persisted)
					.filter(([key]) => key in keySchemas)
					.map(([key, value]) => {
						const result = keySchemas[key].safeParse(value);
						return [key, result.success ? result.data : undefined];
					}),
			);
			// Merge in the url params
			const { title, description, go, ...urlParamsMapped } =
				overrideWithUrlParams(urlParams);

			return {
				...current,
				...persisted,
				...validated,
				// If there's a URL param here it should override these values
				title: title || persisted.title,
				description: description || persisted.description,
				descriptionRaw: description || persisted.descriptionRaw,
				descriptionBackup:
					persisted.descriptionBackup ||
					description ||
					(window.extLaunchData?.showLaunchTitle ? undefined : title),
				go: go || persisted.go,
				urlParams: {
					title,
					description,
					go,
					...urlParamsMapped,
				},
			};
		},
		onRehydrateStorage: () => (state) => {
			if (!state) return;
			queueMicrotask(() => {
				useLaunchDataStore.setState(state);
			});
		},
		partialize: (state) => {
			const {
				statusMessages,
				errorMessage,
				errorCount,
				description,
				descriptionRaw,
				title,
				showExtendifyCodeScreen,
				...rest
			} = state;
			return Object.fromEntries(
				Object.entries(rest).filter(([key, v]) => {
					// An empty set means the fetch failed; keeping it skips the retry.
					if (key === 'siteImages') return siteImageUrls(v).length > 0;
					return Array.isArray(v) ? v.length > 0 : Boolean(v);
				}),
			);
		},
	}),
	state,
);

export const clearPersistedLaunchData = () => {
	useLaunchDataStore.persist.clearStorage();
};
