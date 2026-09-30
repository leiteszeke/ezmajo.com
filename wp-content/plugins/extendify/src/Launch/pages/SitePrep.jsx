import { updateOption } from '@launch/api/WPApi';
import { Title } from '@launch/components/Title';
import { VideoPlayer } from '@launch/components/VideoPlayer';
import { useSiteLogo } from '@launch/hooks/useSiteLogo';
import { useSitePlugins } from '@launch/hooks/useSitePlugins';
import { useSiteProfile } from '@launch/hooks/useSiteProfile';
import { useSiteQuestions } from '@launch/hooks/useSiteQuestions';
import { PageLayout } from '@launch/layouts/PageLayout';
import { pageState } from '@launch/state/factory';
import { usePagesStore } from '@launch/state/Pages';
import { useUserSelectionStore } from '@launch/state/user-selections';
import { useEffect } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

export const state = pageState('Content Gathering', () => ({
	ready: true,
	canSkip: false,
	useNav: false,
	onRemove: () => {},
}));

export const SitePrep = () => {
	const showSiteQuestions = window.extSharedData?.showSiteQuestions ?? false;
	const { nextPage } = usePagesStore();
	const { setSiteProfile, addMany, setSiteQuestions } = useUserSelectionStore();
	const { siteProfile } = useSiteProfile();
	useSiteLogo();
	const { questions } = useSiteQuestions({
		disableFetch: !showSiteQuestions,
	});
	const { sitePlugins } = useSitePlugins({
		disableFetch: showSiteQuestions,
	});

	useEffect(() => {
		if (!siteProfile) return;
		setSiteProfile(siteProfile);
		updateOption('extendify_site_profile', siteProfile);
	}, [siteProfile, setSiteProfile]);

	useEffect(() => {
		let id;

		if (sitePlugins && !showSiteQuestions) {
			addMany('sitePlugins', sitePlugins, { clearExisting: true });
			id = setTimeout(nextPage, 1000);
		}

		if (questions && showSiteQuestions) {
			const visible = (questions?.visible || []).map((q) => ({
				...q,
				group: 'visible',
			}));
			const hidden = (questions?.hidden || []).map((q) => ({
				...q,
				group: 'hidden',
			}));
			const allQuestions = [...visible, ...hidden];
			setSiteQuestions({
				showHidden: false,
				questions: allQuestions,
			});
			id = setTimeout(nextPage, 1000);
		}

		return () => clearTimeout(id);
	}, [
		nextPage,
		addMany,
		questions,
		setSiteQuestions,
		showSiteQuestions,
		sitePlugins,
	]);

	return (
		<PageLayout>
			<div className="mx-auto grow overflow-y-auto px-4 py-8 md:p-12 md:px-6 3xl:p-16">
				<div className="mx-auto flex h-full flex-col justify-center">
					<VideoPlayer
						poster={`${window.extSharedData.assetPath}/data-processing.webp`}
						path="https://images.extendify-cdn.com/launch/data-processing.webm"
						className="mx-auto h-auto w-72 md:h-[288px]"
					/>

					<Title
						title={__('Customizing Your Experience', 'extendify-local')}
						description={__(
							'Please wait while we analyze your inputs and tailor your experience.',
							'extendify-local',
						)}
					/>
				</div>
			</div>
		</PageLayout>
	);
};
