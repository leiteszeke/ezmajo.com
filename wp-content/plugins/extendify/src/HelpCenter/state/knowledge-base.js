import { safeParseJson } from '@shared/lib/parsing';
import apiFetch from '@wordpress/api-fetch';
import { create } from 'zustand';
import { createJSONStorage, devtools, persist } from 'zustand/middleware';

const startingState = {
	articles: [],
	recentArticles: [],
	viewedArticles: [],
	searchTerm: '',
	// initialize the state with default values
	...(safeParseJson(window.extHelpCenterData.userData.supportArticlesData)
		?.state ?? {}),
};

const state = (set, get) => ({
	...startingState,
	pushArticle: (article) => {
		const { slug, title } = article;
		const state = get();
		const lastViewedAt = new Date().toISOString();
		const firstViewedAt = lastViewedAt;
		const viewed = state.viewedArticles.find((a) => a.slug === slug);
		const viewedArticles = [
			// Remove the article if it's already in the list
			...state.viewedArticles.filter((a) => a.slug !== slug),
			// Either add the article or update the count
			viewed
				? { ...viewed, count: viewed.count + 1, lastViewedAt }
				: {
						slug,
						title,
						firstViewedAt,
						lastViewedAt,
						count: 1,
					},
		];

		// Persist the detailed history to the server (don't wait for response)
		apiFetch({
			path: '/extendify/v1/help-center/support-articles-data',
			method: 'POST',
			data: { state: { viewedArticles } },
		});

		set({
			articles: [article, ...state.articles],
			recentArticles: [article, ...state.recentArticles.slice(0, 9)],
			viewedArticles,
		});
	},
	popArticle: () => set((state) => ({ articles: state.articles.slice(1) })),
	clearArticles: () => set({ articles: [] }),
	reset: () => set({ articles: [], searchTerm: '' }),
	updateTitle: (slug, title) =>
		set((state) => ({
			articles: state.articles.map((article) => {
				// We don't always know the title until after we fetch the article data
				if (article.slug === slug) {
					article.title = title;
				}
				return article;
			}),
		})),
	clearSearchTerm: () => set({ searchTerm: '' }),
	setSearchTerm: (searchTerm) => set({ searchTerm }),
});

export const useKnowledgeBaseStore = create(
	persist(devtools(state, { name: 'Extendify Help Center Knowledge Base' }), {
		name: `extendify-help-center-knowledge-base-${window.extSharedData.siteId}`,
		storage: createJSONStorage(() => sessionStorage),
	}),
);
