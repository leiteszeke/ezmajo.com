import { pages } from '@page-creator/lib/pages';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

const store = (set, get) => ({
	pages: new Map(pages),
	currentPageIndex: 0,
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
	findPreviousValidPage: (idx) => {
		let prevIdx = idx;
		do {
			prevIdx -= 1;
		} while (prevIdx > 0);
		return prevIdx;
	},
	nextPage: () => {
		const pageIndex = get().currentPageIndex + 1;
		get().setPage(pageIndex);
	},
	previousPage: () => {
		get().setPage(get().findPreviousValidPage(get().currentPageIndex));
	},
});

const withDevtools = devtools(store, {
	name: 'Extendify Page Creator Pages',
	serialize: true,
});

export const usePagesStore = create(withDevtools);
