import { getPageImages } from '@page-creator/api/DataApi';
import { usePageProfile } from '@page-creator/hooks/usePageProfile';
import { useGlobalsStore } from '@page-creator/state/global';
import { useEffect } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import useSWRImmutable from 'swr/immutable';

export const useSiteImages = () => {
	const { loading, pageProfile } = usePageProfile();
	const { setProgress, regenerationCount } = useGlobalsStore();

	const { data, error } = useSWRImmutable(
		loading ? null : { key: `page-images-${regenerationCount}`, pageProfile },
		getPageImages,
	);

	useEffect(() => {
		if (data) return;
		setProgress(__('Finding images...', 'extendify-local'));
	}, [data, setProgress]);

	return { siteImages: data, error, loading: !data && !error };
};
