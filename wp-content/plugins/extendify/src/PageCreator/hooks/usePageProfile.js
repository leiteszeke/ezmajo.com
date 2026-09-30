import { getPageProfile } from '@page-creator/api/DataApi';
import { usePageDescriptionStore } from '@page-creator/state/cache';
import { useGlobalsStore } from '@page-creator/state/global';
import { useSiteProfileStore } from '@shared/state/site-profile';
import { useEffect } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import useSWRImmutable from 'swr/immutable';

// Returns the site profile and page profile
export const usePageProfile = () => {
	const { description } = usePageDescriptionStore();
	const { setProgress, regenerationCount } = useGlobalsStore();
	const { siteProfile } = useSiteProfileStore();

	const { data, error } = useSWRImmutable(
		{ key: `page-profile-${regenerationCount}`, description, siteProfile },
		getPageProfile,
	);

	useEffect(() => {
		if (data) return;
		setProgress(__('Generating AI page profile...', 'extendify-local'));
	}, [data, setProgress]);

	return {
		pageProfile: data,
		error,
		loading: !data && !error,
	};
};
