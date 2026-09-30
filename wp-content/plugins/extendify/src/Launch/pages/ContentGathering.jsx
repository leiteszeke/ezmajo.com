import { Title } from '@launch/components/Title';
import { VideoPlayer } from '@launch/components/VideoPlayer';
import { useHomeLayouts } from '@launch/hooks/useHomeLayouts';
import { useSiteImages } from '@launch/hooks/useSiteImages';
import { useSitePlugins } from '@launch/hooks/useSitePlugins';
import { useSiteStrings } from '@launch/hooks/useSiteStrings';
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

export const ContentGathering = () => {
	const showSiteQuestions = window.extSharedData?.showSiteQuestions ?? false;
	const { loading: loadingSitePlugins, sitePlugins } = useSitePlugins();
	const waitForPlugins = showSiteQuestions && loadingSitePlugins;
	const { nextPage } = usePagesStore();
	const { setSiteStrings, setSiteImages, addMany } = useUserSelectionStore();
	const { siteStrings } = useSiteStrings();
	const { siteImages } = useSiteImages();
	const { homeLayouts } = useHomeLayouts({
		disableFetch: waitForPlugins,
	});

	useEffect(() => {
		if (!sitePlugins) return;
		addMany('sitePlugins', sitePlugins, { clearExisting: true });
	}, [addMany, sitePlugins]);

	useEffect(() => {
		if (!siteStrings) return;
		setSiteStrings(siteStrings);
	}, [siteStrings, setSiteStrings]);

	useEffect(() => {
		if (!siteImages) return;
		setSiteImages(siteImages);
	}, [siteImages, setSiteImages]);

	useEffect(() => {
		if (!homeLayouts) return;
		const id = setTimeout(nextPage, 1000);
		return () => clearTimeout(id);
	}, [homeLayouts, nextPage]);

	return (
		<PageLayout>
			<div className="mx-auto grow overflow-y-auto px-4 py-8 md:p-12 md:px-6 3xl:p-16">
				<div className="mx-auto flex h-full flex-col justify-center">
					<VideoPlayer
						poster={`${window.extSharedData.assetPath}/site-building.webp`}
						path="https://images.extendify-cdn.com/launch/site-building.webm"
						className="mx-auto h-auto w-[200px] md:h-[400px] md:w-[400px]"
					/>

					<Title
						title={__('Designing Your Options', 'extendify-local')}
						description={__(
							'Please wait while we build some website options for you to select from.',
							'extendify-local',
						)}
					/>
				</div>
			</div>
		</PageLayout>
	);
};
