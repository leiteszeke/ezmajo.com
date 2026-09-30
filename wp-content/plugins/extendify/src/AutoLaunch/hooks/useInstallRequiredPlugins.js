import { handleSitePlugins } from '@auto-launch/fetchers/get-plugins';
import { ensurePluginsActive } from '@auto-launch/functions/plugins';
import { useEffect, useRef } from '@wordpress/element';
import useSWR from 'swr/immutable';

export const useInstallRequiredPlugins = ({ enabled = true } = {}) => {
	const { data, error } = useSWR(enabled ? 'required-plugins' : null, () =>
		handleSitePlugins({ requiredOnly: true }),
	);
	const started = useRef(false);

	useEffect(() => {
		if (started.current || !data?.sitePlugins?.length) return;
		started.current = true;
		ensurePluginsActive(
			data.sitePlugins.map(({ wordpressSlug }) => wordpressSlug),
		);
	}, [data]);

	return {
		requiredPlugins: data?.selectedPlugins || [],
		isLoading: !error && !data,
		isError: error,
	};
};
