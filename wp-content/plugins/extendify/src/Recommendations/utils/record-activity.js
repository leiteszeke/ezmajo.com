import { INSIGHTS_HOST } from '@constants';
import {
	selectActivePlugins,
	selectAllRecommendations,
	selectInstalledPlugins,
} from '@recommendations/selectors/plugin-search';
import { usePluginSearchStore } from '@recommendations/state/plugin-search';
import { objectFromKeys } from '@recommendations/utils/object-from-keys';

const { extSharedData, extRecommendationsData } = window;

const showPartnerBranding = !!(
	extRecommendationsData?.showPartnerBranding && extSharedData?.partnerLogo
);

const stores = {
	'plugin-search': usePluginSearchStore,
};

const validSlots = Object.keys(stores);

export const recordActivity = ({ slot, event, product }) => {
	if (!event || !validSlots.includes(slot)) {
		return;
	}

	const state = stores[slot].getState();

	const installedPlugins = selectInstalledPlugins(state);
	const activePlugins = selectActivePlugins(state);
	const recommendations = selectAllRecommendations(state).map(
		(recommendation) =>
			objectFromKeys(recommendation, [
				'slug',
				'title',
				'description',
				'ctaContent',
				'ctaType',
				'triggerContent',
				'triggerType',
			]),
	);
	const recommendation = recommendations.find(
		(recommendation) => recommendation.slug === product,
	)?.slug;

	const payload = {
		event: event,
		timestamp: new Date().toISOString(),
		slot,
		recommendation,
		recommendations,
		recommendationsLimit: state.recommendationsLimit,
		query: decodeURIComponent(state.query),
		searchResults: state.searchPlugins,
		searchResultsLimit: state.searchPluginsLimit,
		installedPlugins,
		activePlugins,
		partnerBrandingEnabled: showPartnerBranding,
		partnerId: extSharedData.partnerId,
		siteId: extSharedData.siteId,
		wpVersion: extSharedData.wpVersion,
		wpLocale: extSharedData.wpLanguage,
		extendifyVersion: extSharedData.version,
		devbuild: extSharedData.devbuild,
	};

	const controller = new AbortController();

	window.setTimeout(() => {
		controller.abort();
	}, 900);

	fetch(`${INSIGHTS_HOST}/api/v1/recommendations/activity`, {
		method: 'POST',
		headers: {
			Accept: 'application/json',
			'Content-Type': 'application/json',
			'X-Extendify-Site-ID': extSharedData.siteId,
		},
		signal: controller.signal,
		body: JSON.stringify(payload),
	}).catch(() => null);
};
