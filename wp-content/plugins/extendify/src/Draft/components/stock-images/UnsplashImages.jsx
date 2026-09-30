import { UnsplashImage } from '@draft/components/stock-images/UnsplashImage';
import { __ } from '@wordpress/i18n';

export const UnsplashImages = ({
	images,
	isInsertingImage,
	onClick,
	loading,
}) => {
	const imageLength = images?.length ?? 10;

	if (!loading && !images.length) {
		return __('No images found.', 'extendify-local');
	}

	return (
		<div className="columns-2 gap-1">
			{Array.from({ length: imageLength }).map((_, idx) => {
				const skeletonHeight = [150, 175, 200];
				return (
					<UnsplashImage
						key={images?.[idx]?.id ?? idx}
						image={images?.[idx]}
						skeletonHeight={skeletonHeight[idx % skeletonHeight.length]}
						isInsertingImage={isInsertingImage}
						onClick={onClick}
					/>
				);
			})}
		</div>
	);
};
