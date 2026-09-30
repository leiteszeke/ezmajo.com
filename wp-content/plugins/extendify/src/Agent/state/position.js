import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

const DEFAULT_HEIGHT = 600;

const startingPosition = {
	x: window.innerWidth - 410 - 20,
	y: window.innerHeight - DEFAULT_HEIGHT,
	width: 410,
	height: DEFAULT_HEIGHT,
};

export const usePositionStore = create()(
	persist(
		devtools(
			(set) => ({
				...startingPosition,
				setSize: (width, height) => set({ width, height }),
				setPosition: (x, y) => set({ x, y }),
				resetPosition: () =>
					set({
						...startingPosition,
						y: window.innerHeight - DEFAULT_HEIGHT,
					}),
			}),
			{ name: 'Extendify Agent Position' },
		),
		{
			name: `extendify-agent-position-${window.extSharedData.siteId}`,
		},
	),
);
