import { safeLocalStorage } from '@shared/state/safe-local-storage';
import { create } from 'zustand';
import { createJSONStorage, devtools, persist } from 'zustand/middleware';

const initialState = {
	experienceLevel: 'beginner',
	currentQuestion: undefined,
};

const state = (set, get) => ({
	history: [],
	...initialState,
	setCurrentQuestion: (currentQuestion) => set({ currentQuestion }),
	setExperienceLevel: (experienceLevel) => set({ experienceLevel }),
	addHistory: (question) =>
		set((state) => ({
			// Save the latest 10
			history: [
				question,
				...state.history
					.filter(({ answerId }) => answerId !== question.answerId)
					.slice(0, 9),
			],
		})),
	hasHistory: () => get().history.length > 0,
	clearHistory: () => set({ history: [] }),
	deleteFromHistory: (question) =>
		set((state) => ({
			history: state.history.filter(
				({ answerId: id }) => id !== question.answerId,
			),
		})),
	historyCount: () => get().history.length,
	reset: () => set({ ...initialState }),
});

export const useAIChatStore = create(
	persist(devtools(state, { name: 'Extendify Chat History' }), {
		name: `extendify-chat-history-${window.extSharedData.siteId}`,
		storage: createJSONStorage(() => safeLocalStorage),
	}),
);
