import { usePositionStore } from '@agent/state/position';
import { isInTheFuture } from '@wordpress/date';
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

// Mirrors Tailwind's --breakpoint-md, where WP's admin bar goes big.
export const DESKTOP_MIN_WIDTH = 783;

const url = new URL(window.location.href);
const openAgentFromUrl = url.searchParams.has('extendify-open-agent');
if (openAgentFromUrl) {
	url.searchParams.delete('extendify-open-agent');
	window.history.replaceState({}, '', url.toString());
}
const forceOpen = window.extAgentData?.startOnboarding || openAgentFromUrl;

export const useGlobalStore = create()(
	persist(
		devtools(
			(set, get) => ({
				retryAfter: undefined,
				open: true,
				minimized: false,
				// e.g. floating, docked-left, docked-right ?
				mode: window.extAgentData?.agentPosition,
				queuedTour: null,
				scratch: {},
				isMobile: window.innerWidth < DESKTOP_MIN_WIDTH,
				setIsMobile: (isMobile) => {
					if (get().isMobile === isMobile) return;
					set({ isMobile });
				},
				queueTourForRedirect: (tour) => set({ queuedTour: tour }),
				clearQueuedTour: () => set({ queuedTour: null }),
				setOpen: (open) => {
					if (!open) {
						usePositionStore.getState().resetPosition();
						window.dispatchEvent(
							new CustomEvent('extendify-agent:cancel-workflow'),
						);
					}
					set({ open });
				},
				setMinimized: (minimized) => {
					if (get().minimized === minimized) return;
					set({ minimized });
				},
				toggleOpen: () =>
					set((state) => {
						if (!state.open) {
							usePositionStore.getState().resetPosition();
						}
						return { open: !state.open };
					}),
				updateRetryAfter: (retryAfter) => set({ retryAfter }),
				isChatAvailable: () => {
					const { retryAfter } = get();
					if (!retryAfter) return true;
					const stillWaiting = isInTheFuture(new Date(Number(retryAfter)));
					if (!stillWaiting) set({ retryAfter: undefined });
					return !stillWaiting;
				},
				setScratch: (key, value) =>
					set((state) => ({ scratch: { ...state.scratch, [key]: value } })),
				getScratch: (key) => get().scratch[key] || null,
				deleteScratch: (key) =>
					set((state) => {
						const { [key]: _, ...rest } = state.scratch;
						return { scratch: rest };
					}),
			}),
			{ name: 'Extendify Agent Global' },
		),
		{
			name: `extendify-agent-global-${window.extSharedData.siteId}`,
			merge: (persistedState, currentState) => {
				const open = forceOpen
					? true
					: (persistedState?.open ?? currentState.open);
				return { ...currentState, ...persistedState, open };
			},
			partialize: (state) => {
				// mode is determined on the server
				const { mode, isMobile, ...rest } = state;
				return { ...rest };
			},
		},
	),
);
