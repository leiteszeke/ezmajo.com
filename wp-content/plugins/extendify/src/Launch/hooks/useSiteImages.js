import { getSiteImages } from '@launch/api/DataApi';
import { useSiteProfile } from '@launch/hooks/useSiteProfile';
import useSWRImmutable from 'swr/immutable';

export const useSiteImages = () => {
	const { loading, siteProfile } = useSiteProfile();
	const { data, error } = useSWRImmutable(
		loading ? null : { key: 'site-images', ...siteProfile },
		getSiteImages,
	);
	return { siteImages: data, error, loading: !data && !error };
};
