import { routes as aiRoutes } from '@draft/pages/GenerateImage';
import { routes as generalRoutes } from '@draft/pages/Home';
import { routes as unsplashRoutes } from '@draft/pages/Unsplash';
import { useActivityStore } from '@shared/state/activity';
import apiFetch from '@wordpress/api-fetch';
import { useCallback, useEffect } from '@wordpress/element';
import { create } from 'zustand';
import { createJSONStorage, devtools, persist } from 'zustand/middleware';

const pages = [...generalRoutes, ...aiRoutes, ...unsplashRoutes];

const state = (set, get) => ({
	history: [],
	viewedPages: [],
	current: null,
	goBack: () => {
		if (get().history.length < 2) return;
		const nextPage = get().history[1];
		useActivityStore
			.getState()
			.incrementActivity(`draft-${nextPage.slug}-back`);
		set((state) => ({
			history: state.history.slice(1),
			current: nextPage,
		}));
	},
	setCurrent: (page) => {
		if (!page) return;
		// If history is the same, dont add (they pressed the same button)
		if (get().history[0]?.slug === page.slug) return;
		set((state) => {
			const lastViewedAt = new Date().toISOString();
			const firstViewedAt = lastViewedAt;
			const visited = state.viewedPages.find((a) => a.slug === page.slug);
			return {
				history: [page, ...state.history].filter(Boolean),
				current: page,
				viewedPages: [
					// Remove the page if it's already in the list
					...state.viewedPages.filter((a) => a.slug !== page.slug),
					// Either add the page or update the count
					visited
						? { ...visited, count: visited.count + 1, lastViewedAt }
						: {
								slug: page.slug,
								firstViewedAt,
								lastViewedAt,
								count: 1,
							},
				],
			};
		});
	},
});

const path = '/extendify/v1/draft/router-data';
const storage = {
	getItem: async () => await apiFetch({ path }),
	setItem: async (_name, state) =>
		await apiFetch({ path, method: 'POST', data: { state } }),
};

const useRouterState = create(
	persist(devtools(state, { name: 'Extendify Draft Router' }), {
		name: 'extendify-draft-router',
		storage: createJSONStorage(() => storage),
		skipHydration: true,
		partialize: ({ viewedPages }) => ({ viewedPages }),
	}),
);

export const navigateTo = (slug) => {
	const page = pages.find((a) => a.slug === slug);
	if (!page) return useRouterState.getState().setCurrent(pages[0]);

	useActivityStore.getState().incrementActivity(`draft-${page.slug}`);
	useRouterState.getState().setCurrent(page);
};

export const useRouter = () => {
	const { current, setCurrent, history, goBack } = useRouterState();
	const Component = current?.component ?? (() => null);
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
		navigateTo,
		goBack,
		history,
	};
};
