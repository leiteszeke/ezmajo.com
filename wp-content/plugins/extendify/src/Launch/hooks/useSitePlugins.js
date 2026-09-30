import { getSitePlugins } from '@launch/api/DataApi';
import { useSiteProfile } from '@launch/hooks/useSiteProfile';
import { useUserSelectionStore } from '@launch/state/user-selections';
import useSWR from 'swr';

export const useSitePlugins = ({ disableFetch = false } = {}) => {
	const { loading, siteProfile } = useSiteProfile();
	const { siteQA } = useUserSelectionStore();

	const params = {
		key: 'site-plugins',
		siteProfile,
		siteQA,
	};
	const { data, error } = useSWR(
		loading || disableFetch ? null : params,
		getSitePlugins,
	);

	return { sitePlugins: data, error, loading: !data && !error };
};
