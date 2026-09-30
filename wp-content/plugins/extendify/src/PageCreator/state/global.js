import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

const state = (set) => ({
	open: false,
	setOpen: (open) => set({ open }),
	progress: '',
	setProgress: (progress) => set({ progress }),
	regenerationCount: 0,
	incrementRegenerationCount: () =>
		set((state) => ({ regenerationCount: state.regenerationCount + 1 })),
});

export const useGlobalsStore = create(
	devtools(state, { name: 'Extendify Page Creator Globals' }),
	state,
);
