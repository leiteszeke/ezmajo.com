import { generateCustomContent } from '@page-creator/api/DataApi';
import { usePageLayout } from '@page-creator/hooks/usePageLayout';
import { usePageProfile } from '@page-creator/hooks/usePageProfile';
import { useGlobalsStore } from '@page-creator/state/global';
import { replaceThemeVariables } from '@page-creator/util/replaceThemeVariables';
import { safeParseJson } from '@shared/lib/parsing';
import { useEffect, useMemo } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import useSWRImmutable from 'swr/immutable';

const { state } = safeParseJson(window.extSharedData?.launchDataLegacy);

const siteId = window.extSharedData.siteId;
const currentTheme = window.extSharedData?.themeSlug || 'extendable';

export const usePageCustomContent = () => {
	const { pageProfile } = usePageProfile();
	const { template } = usePageLayout();
	const { setProgress, regenerationCount } = useGlobalsStore();
	const loading = !pageProfile || !template;
	const skipCustomContent = pageProfile?.isImprintPage;

	const params = {
		key: `page-creator-page-custom-content-${regenerationCount}`,
		pageProfile,
		userState: {
			businessInformation: state?.businessInformation,
			siteInformation: state?.siteInformation,
			siteId,
		},
		page: template,
	};

	const { data, error } = useSWRImmutable(
		loading || skipCustomContent ? null : params,
		generateCustomContent,
	);

	const pageData = useMemo(() => {
		if (skipCustomContent && template) {
			return { patterns: template.patterns || [] };
		}
		return data;
	}, [skipCustomContent, template, data]);

	useEffect(() => {
		if (loading) return;
		setProgress(__('Writing custom content...', 'extendify-local'));
	}, [pageData, setProgress, loading]);

	const themeAdjustedPatterns = useMemo(() => {
		if (!pageData?.patterns) return [];
		return pageData.patterns.map((pattern) => ({
			...pattern,
			code: replaceThemeVariables(pattern.code, currentTheme),
		}));
	}, [pageData?.patterns]);

	return {
		page: pageData
			? {
					patterns: themeAdjustedPatterns,
					title: pageProfile.aiTitle,
				}
			: pageData,
		error,
		loading: !pageData && !error,
	};
};
