import { safeParseJson } from '@shared/lib/parsing';
import apiFetch from '@wordpress/api-fetch';
import { create } from 'zustand';
import { createJSONStorage, devtools, persist } from 'zustand/middleware';

const key = 'extendify-help-center-tour-progress';
const startingState = {
	currentTour: null,
	currentStep: undefined,
	preparingStep: undefined,
	progress: [],
	// initialize the state with default values
	...(safeParseJson(window.extHelpCenterData.userData.tourData)?.state ?? {}),
};

const state = (set, get) => ({
	...startingState,
	startTour: async (tourData) => {
		const { trackTourProgress, updateProgress, getStepData, onTourPage } =
			get();

		if (onTourPage(tourData?.settings?.startFrom)) {
			await tourData?.onStart?.(tourData);
			tourData.steps =
				tourData.steps?.filter(
					// Filter out steps that define a condition
					(s) => s?.showOnlyIf?.() || s?.showOnlyIf?.() === undefined,
				) || [];
			await getStepData(0, tourData)?.events?.beforeAttach?.(tourData);
		}

		set({ currentTour: tourData, currentStep: 0, preparingStep: undefined });
		// Increment the opened count
		const tour = trackTourProgress(tourData.id);
		updateProgress(tour.id, {
			openedCount: Number(tour.openedCount) + 1,
			lastAction: 'started',
		});
	},
	onTourPage: (startFrom = null) => {
		const url = window.location.href;
		if (startFrom?.includes(url)) return true;
		const { currentTour } = get();
		return currentTour?.settings?.startFrom?.includes(url);
	},
	completeCurrentTour: async () => {
		const { currentTour, wasCompleted, findTourProgress, updateProgress } =
			get();
		const tour = findTourProgress(currentTour?.id);
		if (!tour?.id) return;
		// if already completed, don't update the completedAt
		if (!wasCompleted(tour.id)) {
			updateProgress(tour.id, {
				completedAt: new Date().toISOString(),
				lastAction: 'completed',
			});
		}
		// Track how many times it was completed
		updateProgress(tour.id, {
			completedCount: Number(tour.completedCount) + 1,
			lastAction: 'completed',
		});
		await currentTour?.onDetach?.();
		await currentTour?.onFinish?.();
		set({ currentTour: null, currentStep: undefined });

		// fire an event to update the site assistant tour status in assistant code base.
		if (tour?.id === 'site-assistant-tour') {
			window.dispatchEvent(
				new CustomEvent('extendify-assist:is-tour-finished', {
					detail: { isFinished: true },
				}),
			);
		}
	},
	closeCurrentTour: async (lastAction) => {
		const { currentTour, findTourProgress, updateProgress } = get();
		const tour = findTourProgress(currentTour?.id);
		if (!tour?.id) return;
		const additional = {};
		if (['redirected'].includes(lastAction)) {
			return updateProgress(tour?.id, { lastAction });
		}
		if (['closed-by-caught-error'].includes(lastAction)) {
			return updateProgress(tour?.id, { lastAction, errored: true });
		}
		if (lastAction === 'closed-manually') {
			additional.closedManuallyCount = Number(tour.closedManuallyCount) + 1;
		}

		await currentTour?.onDetach?.();
		await currentTour?.onFinish?.();
		updateProgress(tour?.id, { lastAction, ...additional });
		set({
			currentTour: null,
			currentStep: undefined,
			preparingStep: undefined,
		});
	},
	findTourProgress: (tourId) =>
		get().progress.find((tour) => tour.id === tourId),
	wasCompleted: (tourId) => get().findTourProgress(tourId)?.completedAt,
	wasOpened: (tourId) =>
		Number(get().findTourProgress(tourId)?.openedCount ?? 0) > 0,
	isSeen: (tourId) => get().findTourProgress(tourId)?.firstSeenAt,
	trackTourProgress: (tourId) => {
		const { findTourProgress } = get();
		// If we are already tracking it, return that
		if (findTourProgress(tourId)) {
			return findTourProgress(tourId);
		}
		set((state) => ({
			progress: [
				...state.progress,
				{
					id: tourId,
					firstSeenAt: new Date().toISOString(),
					updatedAt: new Date().toISOString(),
					completedAt: null,
					lastAction: 'init',
					currentStep: 0,
					openedCount: 0,
					closedManuallyCount: 0,
					completedCount: 0,
					errored: false,
				},
			],
		}));
		return findTourProgress(tourId);
	},
	updateProgress: (tourId, update) => {
		const lastAction = update?.lastAction ?? 'unknown';
		set((state) => {
			const progress = state.progress.map((tour) => {
				if (tour.id === tourId) {
					return {
						...tour,
						...update,
						lastAction,
						updatedAt: new Date().toISOString(),
					};
				}
				return tour;
			});
			return { progress };
		});
	},
	getStepData: (step, tour = get().currentTour) => tour?.steps?.[step] ?? {},
	hasNextStep: () => {
		if (!get().currentTour) return false;
		return Number(get().currentStep) < get().currentTour.steps.length - 1;
	},
	nextStep: async () => {
		const { currentTour, goToStep, updateProgress, currentStep } = get();
		const step = Number(currentStep) + 1;
		await goToStep(step);
		updateProgress(currentTour.id, {
			currentStep: step,
			lastAction: 'next',
		});
	},
	hasPreviousStep: () => {
		if (!get().currentTour) return false;
		return Number(get().currentStep) > 0;
	},
	prevStep: async () => {
		const { currentTour, goToStep, updateProgress, currentStep } = get();
		const step = currentStep - 1;
		await goToStep(step);
		updateProgress(currentTour.id, {
			currentStep: step,
			lastAction: 'prev',
		});
	},
	goToStep: async (step) => {
		const { currentTour, updateProgress, closeCurrentTour, getStepData } =
			get();
		const tour = currentTour;

		// Check that the step is valid
		if (step < 0 || step > tour.steps.length - 1) {
			closeCurrentTour('closed-by-caught-error');
			return;
		}

		updateProgress(tour.id, {
			currentStep: step,
			lastAction: `go-to-step-${step}`,
		});

		const events = getStepData(step)?.events;

		if (events?.beforeAttach) {
			set(() => ({ preparingStep: step }));
			// Make sure the preparing animation runs at least 300ms
			await Promise.allSettled([
				events.beforeAttach?.(tour),
				new Promise((resolve) => setTimeout(resolve, 300)),
			]);
			set(() => ({ preparingStep: undefined }));
		}

		set(() => ({ currentStep: step }));
	},
});

const path = '/extendify/v1/help-center/tour-data';
const storage = {
	getItem: async () => await apiFetch({ path }),
	setItem: async (_name, state) =>
		await apiFetch({ path, method: 'POST', data: { state } }),
};

export const useTourStore = create(
	persist(devtools(state, { name: 'Extendify Tour Progress' }), {
		name: key,
		storage: createJSONStorage(() => storage),
		skipHydration: true,
		partialize: (state) => {
			// return without currentTour or currentStep
			const { currentTour, currentStep, preparingStep, ...newState } = state;
			return newState;
		},
	}),
);
