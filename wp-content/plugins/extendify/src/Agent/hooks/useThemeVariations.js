import apiFetch from '@wordpress/api-fetch';
import { __ } from '@wordpress/i18n';
import useSWRImmutable from 'swr/immutable';

const fetcher = async () => {
	const path = window.location.pathname;
	const s = new URLSearchParams(window.location.search);
	const onEditor =
		path.includes('/wp-admin/post.php') && s.get('action') === 'edit';

	const variations = await apiFetch({
		method: 'GET',
		// On the frontend we need to include layout styles
		path: `/extendify/v1/agent/theme-variations${onEditor ? '' : '?includeLayoutStyles'}`,
	});
	if (!variations || !Array.isArray(variations)) {
		throw new Error(__('Failed to fetch theme variations.', 'extendify-local'));
	}
	return {
		// remove duplicate variations by title
		variations: variations.reduce((acc, variation) => {
			if (!acc.some((v) => v.title === variation.title)) {
				acc.push(variation);
			}
			return acc;
		}, []),
	};
};

export const useThemeVariations = ({ enabled = true } = {}) => {
	const { data, error, isLoading } = useSWRImmutable(
		enabled
			? {
					key: 'theme-variations',
					themeSlug: window.extAgentData.context.themeSlug,
				}
			: null,
		fetcher,
	);
	return { variations: data?.variations, error, isLoading };
};
