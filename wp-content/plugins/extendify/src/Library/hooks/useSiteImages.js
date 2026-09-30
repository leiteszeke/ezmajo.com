import { getSiteImages } from '@library/api/WPApi';
import { siteImageUrls } from '@shared/lib/site-images';
import useSWRImmutable from 'swr/immutable';

export const useSiteImages = () => {
	const { data, error, isLoading } = useSWRImmutable(
		'library-site-images',
		getSiteImages,
	);
	// Patterns here carry no type, so the banner picks are part of one pool.
	return { siteImages: siteImageUrls(data?.siteImages), error, isLoading };
};
