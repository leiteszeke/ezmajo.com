import { pages } from '@launch/lib/pages';
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

const store = (set, get) => ({
	pages: new Map(pages),
	currentPageIndex: 0,
	// Just used for telemetry
	preselectedPages: new Set(),
	addPreselectedPage: (page) => get().preselectedPages.add(page),
	count: () => get().pages.size,
	getPageOrder: () => Array.from(get().pages.keys()),
	getCurrentPageData: () => get().pages.get(get().getCurrentPageSlug()),
	getPageSlug: (idx) => get().getPageOrder()[idx],
	getCurrentPageSlug: () => {
		const page = get().getPageOrder()[get().currentPageIndex];
		if (!page) {
			get().setPage(0);
			return get().getPageOrder()[0];
		}
		return page;
	},
	getPageData: (slug) => get().pages.get(slug),
	getPageState: (slug) => get().getPageData(slug)?.state.getState(),
	getNextPageData: () => {
		const nextIndex = get().currentPageIndex + 1;
		if (nextIndex > get().count() - 1) return {};
		return get().getPageData(get().getPageSlug(nextIndex));
	},
	setPage: (page) => {
		// If page is a string, get the index
		if (typeof page === 'string') {
			page = get().getPageOrder().indexOf(page);
		}
		if (page > get().count() - 1) return;
		if (page < 0) return;
		set({ currentPageIndex: page });
	},
	removePage: (page) => {
		const thePage = get().pages.get(page);
		if (!thePage) return;
		const newPages = new Map();
		get().pages.forEach((value, key) => {
			if (key !== page) {
				newPages.set(key, value);
			}
		});
		set({ pages: newPages });
		// If the page has a cleanup function, run it
		thePage?.state?.getState()?.onRemove();
	},
	addPage: (page, data, after) => {
		// If the after page is not found, throw
		if (!get().pages.has(after)) {
			throw new Error(`Page ${after} not found`);
		}
		// If it already exists return
		if (get().pages.has(page)) return;
		const newPages = new Map();
		get().pages.forEach((value, key) => {
			newPages.set(key, value);
			if (key === after) {
				newPages.set(page, data);
			}
		});
		set({ pages: newPages });
	},
	findPreviousValidPage: (idx) => {
		let prevIdx = idx;
		// go back until you find useNav = true
		do {
			prevIdx -= 1;
		} while (
			prevIdx > 0 &&
			!get().getPageState(get().getPageSlug(prevIdx))?.useNav
		);
		return prevIdx;
	},
	pushHistory: (idx) => {
		history.pushState(
			{
				currentPageIndex: idx,
				currentPageKey: get().getPageSlug(idx),
				previousPageIndex: get().findPreviousValidPage(idx),
			},
			'',
		);
	},
	replaceHistory: (idx) => {
		history.replaceState(
			{
				currentPageIndex: idx,
				currentPageKey: get().getPageSlug(idx),
				previousPageIndex: get().findPreviousValidPage(idx),
			},
			'',
		);
	},
	nextPage: () => {
		const pageIndex = get().currentPageIndex + 1;
		const nextPageState = get().getPageState(get().getPageSlug(pageIndex));
		if (nextPageState?.useNav) get().pushHistory(pageIndex);
		get().setPage(pageIndex);
	},
	previousPage: () => {
		get().setPage(get().findPreviousValidPage(get().currentPageIndex));
	},
});

const withDevtools = devtools(store, {
	name: 'Extendify Launch Pages',
	serialize: true,
});
const withPersist = persist(withDevtools, {
	name: `extendify-pages-${window.extSharedData.siteId}`,
	partialize: (state) => ({
		currentPageIndex: state?.currentPageIndex ?? 0,
		currentPageSlug: state?.getCurrentPageSlug() ?? null,
		availablePages: state?.getPageOrder() ?? [],
	}),
});
export const usePagesStore = create(withPersist);
