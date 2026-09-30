import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

const state = (set) => ({
	open: false,
	setOpen: (open) => set({ open }),
	missingCSSVars: [],
	addMissingCSSVar: (varName) =>
		set((state) => {
			if (state.missingCSSVars.includes(varName)) return state;
			return {
				missingCSSVars: [...state.missingCSSVars, varName],
			};
		}),
});

export const useGlobalsStore = create(
	devtools(state, { name: 'Extendify Library Globals' }),
	state,
);
