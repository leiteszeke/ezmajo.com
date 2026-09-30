import {
	getGeneratedPageTemplate,
	getImprintPageTemplate,
} from '@page-creator/api/DataApi';
import { usePageProfile } from '@page-creator/hooks/usePageProfile';
import { useSiteImages } from '@page-creator/hooks/useSiteImages';
import { useSitePlugins } from '@page-creator/hooks/useSitePlugins';
import { useGlobalsStore } from '@page-creator/state/global';
import { useEffect } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import useSWRImmutable from 'swr/immutable';

export const usePageLayout = () => {
	const { pageProfile } = usePageProfile();
	const { siteImages } = useSiteImages();
	const { sitePlugins } = useSitePlugins();
	const loading = !pageProfile || !siteImages || !sitePlugins;
	const { setProgress, regenerationCount } = useGlobalsStore();

	const params = {
		key: `page-creator-page-layout-${regenerationCount}`,
		pageProfile,
		siteImages,
		sitePlugins,
	};

	const fetcher = pageProfile?.isImprintPage
		? () => getImprintPageTemplate()
		: getGeneratedPageTemplate;

	const { data, error } = useSWRImmutable(loading ? null : params, fetcher);

	useEffect(() => {
		if (data) return;
		setProgress(__('Creating a custom layout...', 'extendify-local'));
	}, [data, setProgress]);

	return { template: data?.template ?? data, error, loading: !data && !error };
};
