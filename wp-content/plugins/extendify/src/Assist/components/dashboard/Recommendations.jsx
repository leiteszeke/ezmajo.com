import { RecommendationCard } from '@assist/components/dashboard/RecommendationCard';
import { isAtLeastNDaysAgo } from '@assist/lib/recommendations';
import { safeParseJson } from '@shared/lib/parsing';
import { __ } from '@wordpress/i18n';

const siteCreatedAt = window.extSharedData?.siteCreatedAt ?? '';
const recommendations =
	safeParseJson(window.extSharedData.resourceData)?.recommendations || [];
const plugins =
	window.extSharedData?.activePlugins?.map((plugin) => plugin.split('/')[0]) ||
	[];

const getRecommendations = () =>
	recommendations
		// Filter out recs that have pluginExclusions, and the plugin is already installed
		.filter((rec) =>
			rec?.pluginExclusions?.length
				? rec?.pluginExclusions?.every(
						(dep) => !plugins.find((plugin) => plugin === dep)?.length,
					)
				: true,
		)
		// Filter out recs where there is a plugin dep, and the plugin is not installed
		.filter((rec) =>
			rec?.pluginDepSlugs?.length
				? rec?.pluginDepSlugs?.every(
						(dep) => plugins.find((plugin) => plugin === dep)?.length,
					)
				: true,
		)
		.sort((a, b) => b.priority - a.priority)
		// filter out recs based on the showAfterDay field
		.filter((rec) =>
			// Only show recommendations after the number of days set in rec.showAfterDay
			isAtLeastNDaysAgo(siteCreatedAt, rec?.showAfterDay ?? 0) ? rec : false,
		);

export const Recommendations = () => {
	const filteredRecommendations = getRecommendations();

	if (!filteredRecommendations?.length) return;

	return (
		<div
			data-test="assist-recommendations-module"
			id="assist-recommendations-module"
			className="h-full w-full rounded-sm border border-gray-300 bg-white p-5 text-base lg:p-8"
		>
			<h2 className="mb-4 mt-0 text-lg font-semibold">
				{__('Website Tools & Plugins', 'extendify-local')}
			</h2>
			<div
				className="grid gap-y-3 md:grid-cols-3 md:gap-3"
				data-test="assist-recommendations-module-list"
			>
				{filteredRecommendations.map((recommendation) => (
					<RecommendationCard
						key={recommendation.slug}
						recommendation={recommendation}
					/>
				))}
			</div>
		</div>
	);
};
