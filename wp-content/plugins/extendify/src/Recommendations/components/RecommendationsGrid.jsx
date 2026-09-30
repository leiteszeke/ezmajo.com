import { RecommendationCard } from '@recommendations/components/RecommendationCard';

export const RecommendationsGrid = ({ recommendations }) => {
	return (
		<div
			className="grid grid-cols-1 gap-4 px-6 pb-8 md:grid-cols-2 3xl:grid-cols-3 5xl:grid-cols-4"
			data-test="extendify-recommendations-grid"
		>
			{recommendations.map((recommendation) =>
				// Don't render the card if the CTA type is not supported.
				['plugin', 'external-link', 'internal-link'].includes(
					recommendation.ctaType,
				) ? (
					<RecommendationCard key={recommendation.slug} {...recommendation} />
				) : null,
			)}
		</div>
	);
};
