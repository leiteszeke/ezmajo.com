import { getSiteLogo } from '@launch/api/DataApi';
import { useSiteProfile } from '@launch/hooks/useSiteProfile';
import { resizeImage } from '@shared/utils/resize-image';
import useSWRImmutable from 'swr/immutable';

export const useSiteLogo = () => {
	const { siteProfile, loading: profileLoading } = useSiteProfile();

	const { data, error } = useSWRImmutable(
		profileLoading || !siteProfile
			? null
			: {
					key: 'site-logo',
					logoObjectName: siteProfile?.logoObjectName,
				},
		async ({ logoObjectName }) => {
			const rawLogoUrl = await getSiteLogo(logoObjectName);
			return await resizeImage(rawLogoUrl, {
				size: { width: 256, height: 256 },
				mimeType: 'image/webp',
			});
		},
	);

	return {
		logoUrl: data,
		error,
		loading: profileLoading || (!data && !error),
	};
};
