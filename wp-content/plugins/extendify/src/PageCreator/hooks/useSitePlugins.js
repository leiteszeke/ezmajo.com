import { getSitePlugins } from '@page-creator/api/DataApi';
import { usePageProfile } from '@page-creator/hooks/usePageProfile';
import useSWR from 'swr';

export const useSitePlugins = ({ disableFetch = false } = {}) => {
	const { loading, pageProfile } = usePageProfile();

	const params = {
		key: 'site-plugins-page-creator',
		pageProfile,
	};
	const { data, error } = useSWR(
		loading || disableFetch ? null : params,
		getSitePlugins,
	);

	return { sitePlugins: data, error, loading: !data && !error };
};
