import { Dashboard } from '@assist/pages/Dashboard';
import { homeIcon } from '@assist/svg';
import { safeParseJson } from '@shared/lib/parsing';
import { useActivityStore } from '@shared/state/activity';
import apiFetch from '@wordpress/api-fetch';
import { useCallback, useEffect, useLayoutEffect } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { create } from 'zustand';
import { createJSONStorage, devtools, persist } from 'zustand/middleware';

const pages = [
	{
		slug: 'dashboard',
		name: __('Dashboard', 'extendify-local'),
		icon: homeIcon,
		component: Dashboard,
	},
];

let onChangeEvents = [];
const state = (set, get) => ({
	history: [],
	viewedPages: [],
	current: null,
	// initialize the state with default values
	...(safeParseJson(window.extAssistData.userData.routerData)?.state ?? {}),
	setCurrent: async (page) => {
		if (!page) return;
		for (const event of onChangeEvents) {
			await event(page, { ...get() });
		}
		// If history is the same, dont add (they pressed the same nav button)
		if (get().history[0]?.slug === page.slug) return;
		useActivityStore.getState().incrementActivity(`assist-${page.slug}`);
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

const path = '/extendify/v1/assist/router-data';
const storage = {
	getItem: async () => await apiFetch({ path }),
	setItem: async (_name, state) =>
		await apiFetch({ path, method: 'POST', data: { state } }),
};

const useRouterState = create(
	persist(devtools(state, { name: 'Extendify Assist Router' }), {
		name: 'extendify-assist-router',
		storage: createJSONStorage(() => storage),
		skipHydration: true,
		partialize: ({ viewedPages }) => ({ viewedPages }),
	}),
);
export const router = {
	onRouteChange: (event) => {
		// dont add if duplicate
		if (onChangeEvents.includes(event)) return;
		onChangeEvents = [...onChangeEvents, event];
	},
	removeOnRouteChange: (event) => {
		onChangeEvents = onChangeEvents.filter((e) => e !== event);
	},
};

let once = false;
export const useRouter = () => {
	const { current, setCurrent, history } = useRouterState();
	const Component = current?.component ?? (() => null);

	const navigateTo = (slug) => {
		if (window.location.hash === `#${slug}`) {
			// Fire the event only
			window.dispatchEvent(new Event('hashchange'));
			return;
		}
		window.location.hash = `#${slug}`;
	};
	useLayoutEffect(() => {
		// if no hash is present use previous or add #dashboard
		if (!window.location.hash) {
			window.location.hash = `#${current?.slug ?? 'dashboard'}`;
		}
	}, [current]);

	useEffect(() => {
		if (once) return;
		once = true;
		// watch url changes for #dashboard, etc
		const handle = () => {
			const hash = window.location.hash.replace('#', '');
			const page = pages.find((page) => page.slug === hash);
			if (!page) {
				navigateTo(current?.slug ?? 'dashboard');
				return;
			}
			setCurrent(page);
			// Update title to match the page
			document.title = page.name;
		};
		window.addEventListener('hashchange', handle);
		if (!current) handle();
		return () => {
			once = false;
			window.removeEventListener('hashchange', handle);
		};
	}, [current, setCurrent]);

	return {
		current,
		CurrentPage: useCallback(
			() => (
				<section aria-live="polite">
					{/* Announce to SR on change */}
					<h1 className="sr-only">{current?.name}</h1>
					<Component />
				</section>
			),
			[current],
		),
		pages,
		navigateTo,
		history,
	};
};
