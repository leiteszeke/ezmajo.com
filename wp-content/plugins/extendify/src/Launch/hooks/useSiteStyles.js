import { getSiteStyles } from '@launch/api/DataApi';
import { useSiteProfile } from '@launch/hooks/useSiteProfile';
import { useUserSelectionStore } from '@launch/state/user-selections';
import useSWRImmutable from 'swr/immutable';

export const useSiteStyles = () => {
	const { siteInformation } = useUserSelectionStore();
	const { loading, siteProfile } = useSiteProfile();

	const { data, error } = useSWRImmutable(
		loading
			? null
			: { key: 'site-styles', title: siteInformation.title, siteProfile },
		getSiteStyles,
	);

	return { siteStyles: data, error, loading: !data && !error };
};
