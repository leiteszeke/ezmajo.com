import { routes as aiRoutes } from '@help-center/pages/AIChat';
import { routes as dashRoutes } from '@help-center/pages/Dashboard';
import { routes as kbRoutes } from '@help-center/pages/KnowledgeBase';
import { routes as tourRoutes } from '@help-center/pages/Tours';
import { safeParseJson } from '@shared/lib/parsing';
import { useActivityStore } from '@shared/state/activity';
import apiFetch from '@wordpress/api-fetch';
import { useCallback, useEffect } from '@wordpress/element';
import { create } from 'zustand';
import { createJSONStorage, devtools, persist } from 'zustand/middleware';

const pages = [...dashRoutes, ...kbRoutes, ...tourRoutes, ...aiRoutes];

const initialState = {
	history: [],
	viewedPages: [],
	current: null,
};

const state = (set, get) => ({
	...initialState,
	// initialize the state with default values
	...(safeParseJson(window.extHelpCenterData.userData.routerData)?.state ?? {}),
	goBack: () => {
		if (get().history.length < 2) return;
		const nextPage = get().history[1];
		useActivityStore.getState().incrementActivity(`hc-${nextPage.slug}-back`);
		set((state) => ({
			history: state.history.slice(1),
			current: nextPage,
		}));
	},
	setCurrent: (page) => {
		if (!page) return;
		// If history is the same, dont add (they pressed the same button)
		if (get().history[0]?.slug === page.slug) return;
		const state = get();
		const lastViewedAt = new Date().toISOString();
		const firstViewedAt = lastViewedAt;
		const visited = state.viewedPages.find((a) => a.slug === page.slug);
		const viewedPages = [
			// Remove the page if it's already in the list
			...state.viewedPages.filter((a) => a.slug !== page.slug),
			// Either add the page or update the count
			visited
				? { ...visited, count: Number(visited.count) + 1, lastViewedAt }
				: {
						slug: page.slug,
						firstViewedAt,
						lastViewedAt,
						count: 1,
					},
		];
		// Persist the detailed history to the server (don't wait for response)
		apiFetch({
			path: '/extendify/v1/help-center/router-data',
			method: 'POST',
			data: { state: { viewedPages } },
		});

		set({
			history: [page, ...state.history].filter(Boolean),
			current: page,
			viewedPages,
		});
	},
	reset: () => set({ ...initialState }),
});

const useRouterState = create(
	persist(devtools(state, { name: 'Extendify Help Center Router' }), {
		name: `extendify-help-center-router-${window.extSharedData.siteId}`,
		storage: createJSONStorage(() => sessionStorage),
		partialize: ({ history, current }) => {
			// remove the component from the current page
			return { history, current: { ...current, component: null } };
		},
	}),
);

export const useRouter = () => {
	const { current, setCurrent, history, goBack, reset } = useRouterState();
	const Component =
		current?.component ??
		pages.find((a) => a.slug === current?.slug)?.component ??
		(() => null);

	useEffect(() => {
		if (current) return;
		setCurrent(pages[0]);
	}, [current, setCurrent]);
	return {
		current,
		CurrentPage: useCallback(
			() => (
				<section aria-live="polite" className="h-full">
					{/* Announce to SR on change */}
					<h1 className="sr-only">{current?.title}</h1>
					<Component />
				</section>
			),
			[current],
		),
		navigateTo: (slug) => {
			const page = pages.find((a) => a.slug === slug);
			if (!page) return setCurrent(pages[0]);

			useActivityStore.getState().incrementActivity(`hc-${page.slug}`);
			setCurrent(page);
		},
		goBack,
		history,
		reset,
	};
};
