import { getOption, updateOption } from '@launch/api/WPApi';
import { AcceptTerms } from '@launch/components/BusinessInformation/AcceptTerms';
import { SiteTones } from '@launch/components/BusinessInformation/Tones';
import { LoadingIndicator } from '@launch/components/LoadingIndicator';
import { Title } from '@launch/components/Title';
import { useFetch } from '@launch/hooks/useFetch';
import { PageLayout } from '@launch/layouts/PageLayout';
import { pageState } from '@launch/state/factory';
import { usePagesStore } from '@launch/state/Pages';
import { useUserSelectionStore } from '@launch/state/user-selections';
import { getUrlParameter } from '@shared/utils/get-url-parameter';
import { Tooltip } from '@wordpress/components';
import { useEffect, useLayoutEffect, useState } from '@wordpress/element';
import { decodeEntities } from '@wordpress/html-entities';
import { __ } from '@wordpress/i18n';
import { Icon, info } from '@wordpress/icons';

const fetcher = async () => ({ title: await getOption('blogname') });
const fetchData = () => ({ key: 'site-info' });
export const state = pageState('Site Information', () => ({
	ready: false,
	canSkip: false,
	useNav: true,
	onRemove: () => {},
}));
const descriptionUrlParameter = getUrlParameter('description', false);
const titleUrlParameter = getUrlParameter('title', false);

export const SiteInformation = () => {
	const { loading } = useFetch(fetchData, fetcher);
	const nextPage = usePagesStore((state) => state.nextPage);
	const {
		businessInformation,
		setBusinessInformation,
		siteInformation,
		setSiteInformation,
		setSiteProfile,
		siteObjective,
		setCTALink,
		CTALink,
		setUrlParameters,
		setSiteQuestions,
		siteQA,
		setSiteStructure,
	} = useUserSelectionStore();
	const isLandingPage = siteObjective === 'landing-page';

	let resolvedTitle = siteInformation.title;
	const isTitleEmpty = !resolvedTitle;
	const isTitleDefault = resolvedTitle === window.extSharedData.siteTitle;
	if ((isTitleEmpty || isTitleDefault) && titleUrlParameter) {
		resolvedTitle = titleUrlParameter;
	}
	const [title, setTitle] = useState(decodeEntities(resolvedTitle || ''));
	const [description, setDescription] = useState(
		businessInformation.description || descriptionUrlParameter || '',
	);
	const [callToActionLink, setCallToActionLink] = useState(CTALink || '');

	useEffect(() => {
		state.setState({ ready: false });
		const timer = setTimeout(() => {
			setSiteInformation('title', title);
			setBusinessInformation('description', description);
			if (isLandingPage && callToActionLink) {
				setCTALink(callToActionLink);
			}
			state.setState({ ready: !!title.length });
			setSiteProfile(undefined); // this also resets SOME state
			updateOption('extendify_site_profile', null);
			if (siteQA?.questions.length !== 0) {
				setSiteQuestions({
					showHidden: false,
					questions: [],
				});
				setSiteStructure(undefined);
			}
		}, 1000);
		return () => clearTimeout(timer);
	}, [
		title,
		description,
		setSiteInformation,
		setBusinessInformation,
		isLandingPage,
		setCTALink,
		callToActionLink,
		setSiteProfile,
		siteQA,
		setSiteQuestions,
		setSiteStructure,
	]);

	useLayoutEffect(() => {
		if (!titleUrlParameter && !descriptionUrlParameter) return;

		setUrlParameters({
			title: titleUrlParameter,
			description: descriptionUrlParameter,
		});
	}, [setUrlParameters]);

	const pageTitle = isLandingPage
		? __('Tell Us About Your Landing Page', 'extendify-local')
		: __('Tell Us About Your Website', 'extendify-local');

	const pageTitleDescription = isLandingPage
		? __(
				"Share your vision, and we'll craft a landing page that's perfectly tailored to your needs, ready to launch in no time. Let's begin by learning more about what you're building.",
				'extendify-local',
			)
		: __(
				"Share your vision, and we'll craft a website that's perfectly tailored to your needs, ready to launch in no time. Let's begin by learning more about what you're building.",
				'extendify-local',
			);

	return (
		<PageLayout>
			<div className="grow overflow-y-auto px-6 py-8 md:p-12 3xl:p-16">
				<Title title={pageTitle} description={pageTitleDescription} />
				<div className="relative mx-auto w-full max-w-xl">
					{loading ? (
						<LoadingIndicator />
					) : (
						<form
							className="flex w-full flex-col gap-4"
							onSubmit={(e) => {
								e.preventDefault();
								if (!state.getState().ready) return;
								nextPage();
							}}
						>
							<SiteTitle
								title={title}
								setTitle={setTitle}
								isLandingPage={isLandingPage}
							/>
							<BusinessInfo
								description={description}
								setDescription={setDescription}
								siteObjective={siteObjective}
							/>
							{isLandingPage && !showSiteQuestions && (
								<SiteCTA
									title={callToActionLink}
									setCTA={setCallToActionLink}
								/>
							)}
							<SiteTones />
							<AcceptTerms />
						</form>
					)}
				</div>
			</div>
		</PageLayout>
	);
};

const SiteTitle = ({ title, setTitle, isLandingPage }) => {
	return (
		<div>
			<label
				htmlFor="extendify-site-title-input"
				className="m-0 text-lg font-medium leading-8 text-gray-900 md:text-base md:leading-10"
			>
				{isLandingPage
					? __('Landing Page title (required)', 'extendify-local')
					: __('Website title (required)', 'extendify-local')}
			</label>
			<input
				data-test="site-title-input"
				autoComplete="off"
				// biome-ignore lint: allow autofocus here
				autoFocus
				type="text"
				name="site-title-input"
				id="extendify-site-title-input"
				className="input-focus h-12 w-full rounded-sm border border-gray-200 px-4 py-6 ring-offset-0"
				value={title}
				onChange={(e) => setTitle(e.target.value)}
				placeholder={__('Enter your website name', 'extendify-local')}
			/>
		</div>
	);
};

const objectivePlaceholders = {
	business: __(
		'E.g., We are a yoga studio in London with professionally trained instructors with focus on hot yoga for therapeutic purposes.',
		'extendify-local',
	),
	ecommerce: __(
		'E.g., We are an online store specializing in eco-friendly home goods, offering sustainably sourced products to help you live a greener lifestyle.',
		'extendify-local',
	),
	blog: __(
		'E.g., A personal finance blog sharing expert tips on budgeting, investing, and achieving financial freedom for young professionals.',
		'extendify-local',
	),
	'landing-page': __(
		'E.g., A free ebook packed with actionable productivity tips and strategies to help you stay focused, manage your time effectively, and achieve your goals.',
		'extendify-local',
	),
	other: __(
		'E.g., A personal photography portfolio featuring a collection of landscape, portrait, and street photography, capturing moments from around the world.',
		'extendify-local',
	),
};
const objectiveLabels = {
	business: __('Describe your business', 'extendify-local'),
	ecommerce: __('Describe your eCommerce website', 'extendify-local'),
	blog: __('Describe your blog', 'extendify-local'),
	'landing-page': __('Describe your Landing Page', 'extendify-local'),
	other: __('Describe your website', 'extendify-local'),
};

const showSiteQuestions = window.extSharedData?.showSiteQuestions ?? false;

const BusinessInfo = ({ description, setDescription, siteObjective }) => {
	return (
		<div>
			<label
				htmlFor="extendify-site-info-input"
				className="m-0 text-lg font-medium leading-8 text-gray-900 md:text-base md:leading-10"
			>
				{showSiteQuestions
					? objectiveLabels.other
					: (objectiveLabels[siteObjective] ?? objectiveLabels.business)}
			</label>
			<textarea
				data-test="site-info-input"
				autoComplete="off"
				rows="4"
				name="site-info-input"
				id="extendify-site-info-input"
				className={
					'input-focus placeholder:text-base h-40 w-full rounded-lg border border-gray-300 p-2 ring-offset-0 placeholder:italic placeholder:opacity-50'
				}
				value={description}
				onChange={(e) => setDescription(e.target.value)}
				placeholder={
					showSiteQuestions
						? objectivePlaceholders.other
						: (objectivePlaceholders[siteObjective] ??
							objectivePlaceholders.business)
				}
			/>
		</div>
	);
};

const SiteCTA = ({ title, setCTA }) => {
	return (
		<div>
			<div className="flex items-center space-x-1">
				<label
					htmlFor="extendify-site-cta-input"
					className="m-0 text-lg font-medium leading-8 text-gray-900 md:text-base md:leading-10"
				>
					{__('Call-To-Action Link', 'extendify-local')}
				</label>
				<Tooltip
					delay={100}
					text={__(
						'This link will be used in all Call-to-Action buttons, directing visitors to your chosen destination.',
						'extendify-local',
					)}
				>
					<Icon icon={info} size="16" className="fill-current text-gray-600" />
				</Tooltip>
			</div>
			<input
				data-test="site-cta-input"
				autoComplete="off"
				type="text"
				name="site-cta-input"
				id="extendify-site-cta-input"
				className="input-focus h-12 w-full rounded-sm border border-gray-200 px-4 py-6 ring-offset-0 placeholder:italic placeholder:opacity-50"
				value={title}
				onChange={(e) => setCTA(e.target.value)}
				placeholder=""
			/>
		</div>
	);
};
