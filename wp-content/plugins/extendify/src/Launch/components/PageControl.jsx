import { TONES } from '@launch/components/BusinessInformation/Tones';
import { NavigationButton } from '@launch/components/NavigationButton';
import {
	PagesSelect,
	state as pagesSelectState,
} from '@launch/pages/PagesSelect';
import {
	SiteStructure,
	state as siteStructureState,
} from '@launch/pages/SiteStructure';
import { useGlobalStore } from '@launch/state/Global';
import { usePagesStore } from '@launch/state/Pages';
import { useUserSelectionStore } from '@launch/state/user-selections';
import { LeftCaret, RightCaret } from '@launch/svg';
import {
	convertToValidParamsArray,
	mapToneValuesToObjects,
} from '@shared/utils/convert-to-valid-params';
import { getUrlParameter } from '@shared/utils/get-url-parameter';
import {
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from '@wordpress/element';
import { __, isRTL } from '@wordpress/i18n';

// This is a bit hacky for faster development.
// We should refactor to include custom flows for each objective
// And allow the router to switch paths along the way
const PagesPageData = {
	component: PagesSelect,
	state: pagesSelectState,
};
const StructurePageData = {
	component: SiteStructure,
	state: siteStructureState,
};

const objectives = ['business', 'ecommerce', 'blog', 'landing-page', 'other'];
const structures = ['single-page', 'multi-page'];
const ALLOWED_SKIP = ['questions', 'info', 'layout', 'pages'];
const ALLOWED_TONES = TONES.map((tone) => tone?.value);

export const PageControl = () => {
	const {
		currentPageIndex,
		addPage,
		removePage,
		pages,
		getPageState,
		previousPage,
		replaceHistory,
		addPreselectedPage,
		getCurrentPageSlug,
	} = usePagesStore();
	const {
		siteStructure,
		siteObjective,
		setSiteObjective,
		setSiteStructure,
		setUrlParameters,
		setSiteInformation,
		setBusinessInformation,
		businessInformation,
		siteQA,
	} = useUserSelectionStore();

	const titleUrlParameter = getUrlParameter('title', false);
	const descriptionUrlParameter = getUrlParameter('description', false);
	const siteObjectiveParam = getUrlParameter('objective', false);
	const siteStructureParam = getUrlParameter('structure', false);
	const siteToneRaw = getUrlParameter('tone', false);
	const siteSkipRaw = getUrlParameter('skip', false);
	const siteToneParam = useMemo(
		() =>
			mapToneValuesToObjects(
				convertToValidParamsArray(siteToneRaw, ALLOWED_TONES),
				TONES,
			),
		[siteToneRaw],
	);
	const siteSkipParam = useMemo(
		() => convertToValidParamsArray(siteSkipRaw, ALLOWED_SKIP),
		[siteSkipRaw],
	);
	const removeStructurePage = useRef(false);
	const toneAppliedOnce = useRef(false);
	const showSiteQuestions = window.extSharedData?.showSiteQuestions ?? false;
	const isValidSiteToneParam =
		Array.isArray(siteToneParam) && siteToneParam?.length > 0;

	useLayoutEffect(() => {
		setUrlParameters({
			title: titleUrlParameter,
			description: descriptionUrlParameter,
			objective: siteObjectiveParam,
			structure: siteStructureParam,
			tone: isValidSiteToneParam ? siteToneParam : null,
			skip:
				Array.isArray(siteSkipParam) && siteSkipParam?.length
					? siteSkipParam
					: null,
		});

		// If we later add more structures, consider having predefined paths
		if (siteStructure === 'multi-page') {
			addPage('page-select', PagesPageData, 'layout');
		}
		// If the site objective is not 'landing-page', add the site structure page
		if (siteObjective !== 'landing-page') {
			addPage('site-structure', StructurePageData, 'site-prep');
		}

		// Landing pages are single-page structure, so we need to remove both page-select and site-structure pages
		if (siteObjective === 'landing-page' && siteStructure === 'single-page') {
			removePage('page-select');
			removePage('site-structure');
		}
		// For any single-page structure (regardless of objective), remove the page-select page
		if (siteStructure === 'single-page') {
			removePage('page-select');
		}
		// If a valid objective parameter is in the URL, set it as the site objective and skip the objective selection page
		if (siteObjectiveParam && objectives.includes(siteObjectiveParam)) {
			setSiteObjective(siteObjectiveParam);
			addPreselectedPage('website-objective');
			removePage('website-objective');
		}

		// If a structure parameter is in the URL, and it's valid, set the structure and skip the structure page
		if (siteStructureParam && structures.includes(siteStructureParam)) {
			setSiteStructure(siteStructureParam);
			addPreselectedPage('site-structure');
			removeStructurePage.current = true;
		}

		if (showSiteQuestions) {
			removePage('site-structure');
		}

		if (isValidSiteToneParam && !toneAppliedOnce.current) {
			const mergedTones = [
				...(businessInformation?.tones || []),
				...siteToneParam,
			];

			const uniqueTones = mergedTones.reduce((acc, tone) => {
				if (!acc.some((t) => t.value === tone.value)) {
					acc.push(tone);
				}
				return acc;
			}, []);

			setBusinessInformation('tones', uniqueTones);
			toneAppliedOnce.current = true;
		}

		if (siteSkipParam.includes('questions')) {
			if (!siteStructureParam) {
				const siteStructureFromQuestions = siteQA?.questions.find(
					(item) => item?.id === 'pages',
				)?.answerAI;

				const mappedStructure = {
					'multiple-pages': 'multi-page',
					'one-page': 'single-page',
				};

				if (
					siteStructureFromQuestions &&
					mappedStructure?.[siteStructureFromQuestions]
				) {
					setSiteStructure(mappedStructure[siteStructureFromQuestions]);
				}
			}

			addPreselectedPage('site-questions');
			removePage('site-questions');
		}

		if (siteSkipParam.includes('info') && titleUrlParameter) {
			setSiteInformation('title', titleUrlParameter);

			if (descriptionUrlParameter) {
				setBusinessInformation('description', descriptionUrlParameter);
			}

			addPreselectedPage('site-information');
			removePage('site-information');
		}

		if (siteSkipParam.includes('pages') && siteStructure === 'multi-page') {
			addPreselectedPage('page-select');
			removePage('page-select');
		}
	}, [
		setSiteObjective,
		setSiteStructure,
		siteStructure,
		siteObjective,
		addPage,
		removePage,
		descriptionUrlParameter,
		titleUrlParameter,
		siteObjectiveParam,
		siteStructureParam,
		siteToneParam,
		siteSkipParam,
		addPreselectedPage,
		showSiteQuestions,
		setUrlParameters,
		setSiteInformation,
		setBusinessInformation,
		businessInformation,
		isValidSiteToneParam,
		siteQA,
	]);

	useEffect(() => {
		if (removeStructurePage.current) removePage('site-structure');
	}, [removePage]);

	useEffect(() => {
		const replaceStateHistory = () => {
			history.state === null && replaceHistory(currentPageIndex);
		};
		window.addEventListener('load', replaceStateHistory);

		const popstate = () => {
			const page = currentPageIndex - 1;
			if (page === -1) history.go(-1);
			previousPage();
		};
		window.addEventListener('popstate', popstate);
		return () => {
			window.removeEventListener('popstate', popstate);
		};
	}, [previousPage, currentPageIndex, replaceHistory]);

	const pagesList = Array.from(pages.entries());
	// Some pages act as a notice or loading message and move on their own
	if (!getPageState(pagesList[currentPageIndex][0])?.useNav) return null;

	const skipInfoStepEnabled =
		siteSkipParam.includes('info') && titleUrlParameter;
	const skipInfoAndQuestionsEnabled =
		skipInfoStepEnabled && siteSkipParam.includes('questions');
	const currentPageSlug = getCurrentPageSlug();
	const forceFirstpage =
		(skipInfoStepEnabled && currentPageSlug === 'site-questions') ||
		(skipInfoAndQuestionsEnabled && currentPageSlug === 'layout');

	return (
		<div className="z-10 w-full flex-none border-t border-gray-100 bg-white px-6 py-5 shadow-surface md:px-12 md:py-6 text-base">
			<div className="flex justify-between">
				<span className="flex-1 self-start">
					<PrevButton forceFirstpage={forceFirstpage} />
				</span>
				<span className="hidden grow items-center justify-center md:flex">
					<Steps />
				</span>
				<span className="flex flex-1 justify-end">
					<NextButton />
				</span>
			</div>
		</div>
	);
};

const Steps = () => {
	const { currentPageIndex, pages, getPageState } = usePagesStore();
	const totalPages = usePagesStore((state) => state.count());
	const pagesList = Array.from(pages.entries());

	return (
		<div
			className="flex"
			role="progressbar"
			aria-valuenow={currentPageIndex}
			aria-valuemin="0"
			aria-valuetext={pagesList[currentPageIndex][1].state.getState().title}
			aria-valuemax={totalPages - 1}
		>
			{pagesList.map(([page], index) => {
				const bgColor =
					index < currentPageIndex ? 'bg-design-main' : 'bg-gray-200';
				if (!getPageState(page)?.useNav) return null;
				return (
					<div key={page} className="flex items-center">
						{(index !== currentPageIndex && (
							<div className={`${bgColor} h-2.5 w-2.5 rounded-full`} />
						)) || (
							<div className="flex h-4 w-4 items-center justify-center rounded-full bg-design-main">
								<div className="h-1.5 w-1.5 rounded-full bg-white/80" />
							</div>
						)}
						{index < totalPages - 1 && (
							<div className={`${bgColor} h-0.5 w-16`} />
						)}
					</div>
				);
			})}
		</div>
	);
};

const PrevButton = ({ forceFirstpage = false }) => {
	const { previousPage, currentPageIndex } = usePagesStore();
	const onFirstPage = currentPageIndex === 0 || forceFirstpage;

	if (onFirstPage) {
		return (
			<NavigationButton
				onClick={() => {
					window.location.href = `${window.extSharedData.adminUrl}admin.php?page=extendify-assist`;
				}}
				id="extendify-exit-launch-button"
				className="border-gray-200 bg-white text-design-main hover:bg-gray-50 focus:bg-gray-50"
			>
				{isRTL() ? (
					<RightCaret className="mt-px h-5 w-5" />
				) : (
					<LeftCaret className="mt-px h-5 w-5" />
				)}

				<span>{__('WP Admin Dashboard', 'extendify-local')}</span>
			</NavigationButton>
		);
	}

	return (
		<NavigationButton
			onClick={previousPage}
			data-test="back-button"
			className="border-gray-200 bg-white text-design-main hover:bg-gray-50 focus:bg-gray-50"
		>
			{isRTL() ? (
				<RightCaret className="mt-px h-5 w-5" />
			) : (
				<LeftCaret className="mt-px h-5 w-5" />
			)}
			<span>{__('Back', 'extendify-local')}</span>
		</NavigationButton>
	);
};

const NextButton = () => {
	const { nextPage, currentPageIndex, pages } = usePagesStore();
	const totalPages = usePagesStore((state) => state.count());
	const onLastPage = currentPageIndex === totalPages - 1;
	const currentPageKey = Array.from(pages.keys())[currentPageIndex];
	const pageState = pages.get(currentPageKey).state;
	const [canProgress, setCanProgress] = useState(false);
	const [canSkip, setCanSkip] = useState(false);

	const nextPageOrComplete = () => {
		if (onLastPage) {
			useGlobalStore.setState({ generating: true });
		} else {
			nextPage();
		}
	};

	useEffect(() => {
		const { ready, canSkip } = pageState?.getState() || {};
		setCanSkip(canSkip ?? false);
		setCanProgress(ready ?? false);
		return pageState.subscribe((s) => {
			setCanSkip(s.canSkip);
			setCanProgress(s.ready);
		});
	}, [pageState, currentPageIndex]);

	return canSkip ? (
		<NavigationButton
			onClick={() => nextPageOrComplete()}
			data-test="back-button"
			className="mr-2 border-gray-200 bg-white text-design-main hover:bg-gray-50 focus:bg-gray-50"
		>
			{__('Skip', 'extendify-local')}
			{isRTL() ? (
				<LeftCaret className="mt-px h-5 w-5" />
			) : (
				<RightCaret className="mt-px h-5 w-5" />
			)}
		</NavigationButton>
	) : (
		<NavigationButton
			onClick={nextPageOrComplete}
			disabled={!canProgress}
			className="border-design-main bg-design-main text-design-text"
			data-test="next-button"
		>
			{__('Next', 'extendify-local')}
			{isRTL() ? (
				<LeftCaret className="mt-px h-5 w-5" />
			) : (
				<RightCaret className="mt-px h-5 w-5" />
			)}
		</NavigationButton>
	);
};
