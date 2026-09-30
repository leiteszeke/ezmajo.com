import { RecommendationsGrid } from '@recommendations/components/RecommendationsGrid';
import {
	selectIsError,
	selectIsLoading,
	selectRecommendations,
} from '@recommendations/selectors/plugin-search';
import { usePluginSearchStore } from '@recommendations/state/plugin-search';
import { recordActivity } from '@recommendations/utils/record-activity';
import { useEffect } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import { safeDecodeURIComponent } from '@wordpress/url';

const showPartnerBranding =
	window.extRecommendationsData?.showPartnerBranding &&
	window.extSharedData?.partnerLogo;

export const PluginSearchBanner = () => {
	const query = usePluginSearchStore((state) => state.query);
	const isLoading = usePluginSearchStore(selectIsLoading);
	const isError = usePluginSearchStore(selectIsError);
	const recommendationsLimit = usePluginSearchStore(
		(state) => state.recommendationsLimit,
	);
	const recommendations = usePluginSearchStore(selectRecommendations);
	const fetchInstalledPlugins = usePluginSearchStore(
		(state) => state.fetchInstalledPlugins,
	);

	useEffect(() => {
		if (!query || isLoading) return;
		recordActivity({ slot: 'plugin-search', event: 'search' });
	}, [query, isLoading]);

	useEffect(() => {
		if (!query) return;
		fetchInstalledPlugins(true);
	}, [query, fetchInstalledPlugins]);

	if (!query || !recommendations?.length || isLoading || isError) {
		return null;
	}

	return (
		<div
			className="my-8 flex w-full flex-col overflow-hidden rounded-sm border border-gray-400 bg-white"
			data-test="extendify-recommendations-banner"
		>
			<div
				className={`flex h-14 ${showPartnerBranding ? 'bg-banner-main' : ''} px-6 py-4`}
			>
				{showPartnerBranding ? (
					<>
						<img
							alt={window.extSharedData?.partnerName || 'Partner Logo'}
							className="mr-3 h-full"
							src={window.extSharedData?.partnerLogo}
						/>
						<div className="mr-3 border-l border-banner-text opacity-80" />
					</>
				) : null}
				<h2
					className={`m-0 flex h-full items-center ${showPartnerBranding ? 'text-banner-text' : ''} `}
				>
					{sprintf(
						// translators: %s: The search query term
						__('Recommended Solutions for: %s', 'extendify-local'),
						safeDecodeURIComponent(query),
					)}
				</h2>
			</div>
			<RecommendationsGrid
				recommendations={recommendations.slice(0, recommendationsLimit)}
			/>
		</div>
	);
};
