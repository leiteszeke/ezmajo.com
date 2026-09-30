import { safeParseJson } from '@shared/lib/parsing';
import apiFetch from '@wordpress/api-fetch';
import { create } from 'zustand';
import { createJSONStorage, devtools, persist } from 'zustand/middleware';

const startingState = {
	// These are tests the user is in progress of completing.
	// Not to be confused with tasks that are in progress.
	// ! This should have probably been in Global or elsewhere?
	activeTests: [],
	// These are tasks that the user has seen. When added,
	// they will look like [{ key, firstSeenAt }]
	seenTasks: [],
	// These are tasks the user has already completed
	// [{ key, completedAt }] but it used to just be [key]
	// so use ?.completedAt to check if it's completed with the (.?)
	completedTasks: [],
	inProgressTasks: [],
	// These are the tasks dependencies
	tasksDependencies: {
		...safeParseJson(window.extAssistData.userData.tasksDependencies),
	},
	// initialize the state with default values
	...(safeParseJson(window.extAssistData.userData.taskData)?.state ?? {}),
};

const state = (set, get) => ({
	...startingState,
	// We need to keep the tasks dependencies updated all the time,
	// the user may complete the task from outside the cards, this will
	// make sure they are always up-to-date.
	tasksDependencies: {
		...safeParseJson(window.extAssistData.userData.tasksDependencies),
	},
	isCompleted(taskId) {
		const completed = get().completedTasks.some((task) => task?.id === taskId);

		// overrides for specific plugin "behind the scenes" tasks
		const {
			completedWoocommerceStore,
			completedSetupGivewp,
			completedSetupAIOSeo,
			completedWPFormsLite,
			completedYourWebShop,
			completedMonsterInsights,
		} = get().tasksDependencies || {};
		if (taskId === 'setup-givewp') return completedSetupGivewp || completed;
		if (taskId === 'setup-woocommerce-store')
			return completedWoocommerceStore || completed;
		if (taskId === 'setup-aioses') return completedSetupAIOSeo || completed;
		if (taskId === 'setup-wpforms') return completedWPFormsLite || completed;
		if (taskId === 'setup-yourwebshop')
			return completedYourWebShop || completed;
		if (taskId === 'setup-monsterinsights')
			return completedMonsterInsights || completed;

		return completed;
	},
	completeTask(taskId) {
		if (get().isCompleted(taskId)) {
			return;
		}
		set((state) => ({
			completedTasks: [
				...state.completedTasks,
				{
					id: taskId,
					completedAt: new Date().toISOString(),
				},
			],
		}));
		// Dispatch event to notify others
		window.dispatchEvent(
			new CustomEvent('extendify-assist-task-completed', {
				detail: { ...get() },
			}),
		);
	},
	// Marks the task as dismissed: true
	dismissTask(taskId) {
		get().completeTask(taskId);
		set((state) => {
			const { completedTasks } = state;
			const task = completedTasks.find((task) => task.id === taskId);
			return {
				completedTasks: [
					...completedTasks.filter((task) => task.id !== taskId),
					{ ...task, dismissed: true },
				],
			};
		});
	},
	isSeen(taskId) {
		return get().seenTasks.some((task) => task?.id === taskId);
	},
	seeTask(taskId) {
		if (get().isSeen(taskId)) {
			return;
		}
		const task = {
			id: taskId,
			firstSeenAt: new Date().toISOString(),
		};
		set((state) => ({
			seenTasks: [...state.seenTasks, task],
		}));
	},
	uncompleteTask(taskId) {
		set((state) => ({
			completedTasks: state.completedTasks.filter((task) => task.id !== taskId),
		}));
	},
	toggleCompleted(taskId) {
		if (get().isCompleted(taskId)) {
			get().uncompleteTask(taskId);
			return;
		}
		get().completeTask(taskId);
	},
});

const path = '/extendify/v1/assist/task-data';
const storage = {
	getItem: async () => await apiFetch({ path }),
	setItem: async (_name, state) =>
		await apiFetch({ path, method: 'POST', data: { state } }),
};

export const useTasksStore = create(
	persist(devtools(state, { name: 'Extendify Assist Tasks' }), {
		storage: createJSONStorage(() => storage),
		skipHydration: true,
	}),
);
