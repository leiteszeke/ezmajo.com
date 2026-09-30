import { Transition } from '@headlessui/react';
import { getPageTemplates } from '@launch/api/DataApi';
import { importTemporaryProducts } from '@launch/api/WooCommerce';
import {
	addPageLinksToNav,
	addSectionLinksToNav,
	createNavigation,
	getActivePlugins,
	getOption,
	getPageById,
	installFontFamilies,
	postLaunchFunctions,
	prefetchAssistData,
	updateNavAttributes,
	updateOption,
	updatePageTitlePattern,
	updateTemplatePart,
} from '@launch/api/WPApi';
import { PagesSkeleton } from '@launch/components/CreatingSite/PageSkeleton';
import { useConfetti } from '@launch/hooks/useConfetti';
import { useSiteLogo } from '@launch/hooks/useSiteLogo';
import { useWarnOnLeave } from '@launch/hooks/useWarnOnLeave';
import {
	updateButtonLinks,
	updateSinglePageLinksToSections,
} from '@launch/lib/linkPages';
import { uploadLogo } from '@launch/lib/logo';
import {
	addImprintPage,
	createBlogSampleData,
	createWpPages,
	generateCustomPageContent,
	replacePlaceholderPatterns,
	setHelloWorldFeaturedImage,
	updateGlobalStyleVariant,
	updateNaturalVibeStyles,
} from '@launch/lib/wp';
import { usePagesStore } from '@launch/state/Pages';
import { usePagesSelectionStore } from '@launch/state/pages-selections';
import { useUserSelectionStore } from '@launch/state/user-selections';
import { Logo, Spinner } from '@launch/svg';
import { buildRecommendedPagesParams } from '@launch/utils/buildRecommendedPagesParams';
import { getPartnerPlugins, recordPluginActivity } from '@shared/api/DataApi';
import { activatePlugin, installPlugin } from '@shared/api/wp';
import { pageNames } from '@shared/lib/pages';
import {
	deepMerge,
	retryOperation,
	waitFor200Response,
	wasPluginInstalled,
} from '@shared/lib/utils';
import { useAIConsentStore } from '@shared/state/ai-consent';
import { dispatch, select } from '@wordpress/data';
import { useCallback, useEffect, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { colord } from 'colord';

const {
	homeUrl,
	adminUrl,
	partnerLogo,
	partnerName,
	showImprint,
	wpLanguage,
	installedPluginsSlugs,
} = window.extSharedData;

export const CreatingSite = () => {
	const [isShowing] = useState(true);
	const [confettiReady, setConfettiReady] = useState(false);
	const [confettiColors, setConfettiColors] = useState(['#ffffff']);
	const [warnOnLeaveReady, setWarnOnLeaveReady] = useState(true);
	const [loadAdmin, setLoadAdmin] = useState(false);
	const {
		siteType,
		siteInformation,
		siteStructure,
		sitePlugins,
		variation,
		siteProfile,
		siteStrings,
		siteImages,
		CTALink,
		siteObjective,
		siteQA,
		urlParameters,
		setSiteStrings,
	} = useUserSelectionStore();
	const { pages, style, removeAll, add } = usePagesSelectionStore();
	const [info, setInfo] = useState([
		__('Preparing to build your site', 'extendify-local'),
	]);
	const [infoDesc, setInfoDesc] = useState([
		// Because useSiteLogo causes a noticeable delay, we set this initial desc to match
		__('Generating a site logo', 'extendify-local'),
	]);
	const inform = (msg) => setInfo((info) => [msg, ...info]);
	const informDesc = (msg) => setInfoDesc((infoDesc) => [msg, ...infoDesc]);
	const [pagesToAnimate, setPagesToAnimate] = useState([]);
	const { setPage } = usePagesStore();
	const customFontFamilies =
		variation?.settings?.typography?.fontFamilies?.custom;
	const { setUserGaveConsent } = useAIConsentStore();
	const { loading: logoLoading, logoUrl } = useSiteLogo();
	const redirectUrl =
		// on landing pages for some users, we redirect to home_url
		(window.extOnbData?.redirectToWebsite &&
			siteObjective === 'landing-page') ||
		window.extSharedData?.showAIAgents
			? `${homeUrl}?extendify-launch-success=1`
			: `${adminUrl}admin.php?page=extendify-assist&extendify-launch-success=1`;
	const shouldLoadPages =
		urlParameters?.skip?.includes('pages') && siteStructure === 'multi-page';
	const [pagesLoaded, setPagesLoaded] = useState(false);

	useWarnOnLeave(warnOnLeaveReady);

	const loadRecommendedPages = useCallback(async () => {
		const recommended = await getPageTemplates(buildRecommendedPagesParams());
		removeAll('pages');
		recommended.recommended.forEach((page) => {
			add('pages', page);
		});
		setPagesLoaded(true);
	}, [removeAll, add]);

	useEffect(() => {
		if (!shouldLoadPages) return;
		if (pagesLoaded) return;
		loadRecommendedPages().catch(console.error);
	}, [shouldLoadPages, pagesLoaded, loadRecommendedPages]);

	const doEverything = useCallback(async () => {
		try {
			const blogQuestion = siteQA?.questions?.find(
				(question) => question.id === 'blog',
			);
			const hasBlogGoal = blogQuestion
				? (blogQuestion?.answerUser ?? blogQuestion?.answerAI) === 'yes'
				: siteObjective === 'blog' || false;
			const needsImprintPage = Array.isArray(showImprint)
				? showImprint.includes(wpLanguage ?? '') &&
					siteProfile?.aiSiteCategory === 'Business'
				: false;

			await uploadLogo(logoUrl, { forceReplace: true });

			await updateOption('permalink_structure', '/%postname%/');
			await waitFor200Response();
			inform(__('Applying your website styles', 'extendify-local'));
			informDesc(__('Creating a beautiful website', 'extendify-local'));
			await new Promise((resolve) => setTimeout(resolve, 1000));

			// If they are launching the site, it means they agreed to the terms
			setUserGaveConsent(true);

			if (siteInformation.title) {
				await updateOption('blogname', siteInformation.title);
			}

			await waitFor200Response();
			// TODO: Refactor to assume 0default for site type
			const siteTypeUpdated = {
				...(siteType ?? {}),
				// Override with the ai site type if it exists
				name: siteProfile?.aiSiteType ?? siteType.name,
			};

			await updateOption(
				'extendify_siteType',
				// Only persist the site type if the slug exists
				siteType?.slug ? siteTypeUpdated : {},
			);

			await waitFor200Response();
			// Install font families that are not in the theme.
			if (customFontFamilies?.length) {
				const installedFontFamilies =
					await installFontFamilies(customFontFamilies);
				await updateGlobalStyleVariant(
					deepMerge(
						variation,
						// We set to null first to reset the field.
						{ settings: { typography: { fontFamilies: { custom: null } } } },
						// We add the installed font families here to activate them.
						{
							settings: {
								typography: {
									fontFamilies: {
										custom: installedFontFamilies.filter(Boolean),
									},
								},
							},
						},
					) ?? {},
				);
			} else {
				await updateGlobalStyleVariant(variation);
			}

			await waitFor200Response();

			const selectedVibe = style?.siteStyle?.vibe;
			const selectedAnimation = style?.siteStyle?.animation;
			if (selectedVibe && selectedVibe !== 'natural-1') {
				inform(
					// translators: "site style" refers to the structural aesthetic style for the site.
					__('Applying site style', 'extendify-local'),
				);
				informDesc(
					// translators: "site style" refers to the structural aesthetic style for the site.
					__('Customizing your site style', 'extendify-local'),
				);
				await updateNaturalVibeStyles(selectedVibe);
				await new Promise((resolve) => setTimeout(resolve, 1000));
			}

			const navigationId = await createNavigation();

			let headerCode = updateNavAttributes(style?.headerCode, {
				ref: navigationId,
			});
			if (siteObjective === 'landing-page') {
				// remove the header navigation from the landing page
				headerCode = headerCode
					.replace(/<!--\s*wp:navigation\b[^>]*.*\/-->/gis, '')
					.replace(
						/<!--\s*wp:social-links\b[^>]*>.*?<!--\s*\/wp:social-links\s*-->/gis,
						'',
					);
			}

			let footerCode = style?.footerCode;
			let footerNavigationId = null;
			let footerNavPages = [];

			if (needsImprintPage) {
				footerNavigationId = await createNavigation(
					'content',
					__('Footer Navigation', 'extendify-local'),
					'footer-navigation',
				);
				footerCode = updateNavAttributes(footerCode, {
					ref: footerNavigationId,
				});
			}

			await waitFor200Response();
			await updateTemplatePart('extendable/header', headerCode);

			await waitFor200Response();
			await updateTemplatePart('extendable/footer', footerCode);

			inform(__('Populating data', 'extendify-local'));
			informDesc(__('Personalizing your experience', 'extendify-local'));
			await prefetchAssistData();
			await waitFor200Response();
			await new Promise((resolve) => setTimeout(resolve, 1000));

			// Store the site vibes, colorPalette and fonts
			await updateOption(
				'extendify_siteStyle',
				style?.siteStyle || {
					vibe: 'standard',
					fonts: { heading: {}, body: {} },
					colorPalette: null,
				},
			);

			// Store animation settings if present
			if (selectedAnimation) {
				await waitFor200Response();
				// Handle both string and object formats
				const animationSettings =
					typeof selectedAnimation === 'string'
						? { type: selectedAnimation, speed: 'medium' }
						: selectedAnimation;
				await updateOption('extendify_animation_settings', animationSettings);
			}

			// Add required plugins to the end of the list to give them lower priority
			// when filtering out duplicates.
			const sortedPlugins = [...sitePlugins]
				// Remove duplicates
				.reduce((acc, plugin) => {
					const found = acc.find(
						({ wordpressSlug: s }) => s === plugin.wordpressSlug,
					);
					if (!found) acc.push(plugin);
					return acc;
				}, [])
				// We add give to the front. See here why:
				// https://github.com/extendify/company-product/issues/713
				.sort(({ wordpressSlug }) => (wordpressSlug === 'give' ? -1 : 1));

			if (sortedPlugins?.length) {
				inform(__('Preparing site functionality', 'extendify-local'));
				await new Promise((resolve) => setTimeout(resolve, 1000));

				const pluginInstallMessages = [
					__('Getting everything ready', 'extendify-local'),
					__('Enhancing your site', 'extendify-local'),
					__('Setting up essential tools', 'extendify-local'),
				];
				informDesc(pluginInstallMessages?.at(-1));
				for (const [index, plugin] of sortedPlugins.entries()) {
					const slug = plugin?.wordpressSlug;
					// Don't install if already installed
					if (!installedPluginsSlugs?.includes(slug)) {
						await retryOperation(() => installPlugin(slug), {
							maxAttempts: 2,
						}).catch(console.error);

						recordPluginActivity({ slug, source: 'launch' });
						if (index % 2 === 1) {
							// skip first message
							const i = Math.floor(index / 2) % pluginInstallMessages.length;
							informDesc(pluginInstallMessages[i]);
						}
					}

					await retryOperation(() => activatePlugin(slug), {
						maxAttempts: 2,
					}).catch(console.error);
				}
			}

			const homePage = {
				name: pageNames.home.title,
				id: 'home',
				patterns: style.patterns,
				slug: 'home',
			};
			// Home's blog section leaves posts unreachable without a posts page.
			const needsBlog =
				hasBlogGoal ||
				homePage.patterns?.some((pattern) =>
					pattern.patternTypes?.includes('blog-section'),
				);
			const blogPage =
				needsBlog && !pages.some(({ slug }) => slug === 'blog')
					? {
							name: pageNames.blog.title,
							id: 'blog',
							patterns: [],
							slug: 'blog',
						}
					: null;

			await waitFor200Response();

			inform(__('Adding page content', 'extendify-local'));
			informDesc(__('Starting off with a full website', 'extendify-local'));
			await new Promise((resolve) => setTimeout(resolve, 1000));
			await waitFor200Response();

			if (siteProfile.aiDescription) {
				informDesc(__('Creating pages with custom content', 'extendify-local'));
				[homePage, ...pages].forEach((page) => {
					setPagesToAnimate((previous) => [...previous, page.name]);
				});
			}

			const pagesWithoutPageTitlePattern = pages.map((page) => ({
				...page,
				patterns: page.patterns.filter(
					(p) => !p.patternTypes?.includes('page-title'),
				),
			}));

			// Update the page-with-title template with the selected page-title pattern
			const firstPageTitlePattern = pages?.[0]?.patterns?.find((p) =>
				p.patternTypes?.includes('page-title'),
			);

			const hasPageWithTitleTemplate = firstPageTitlePattern
				? await updatePageTitlePattern(firstPageTitlePattern.code)
				: false;

			const pagesToUse = hasPageWithTitleTemplate
				? pagesWithoutPageTitlePattern
				: pages;

			const pagesToCreate = [...pagesToUse, homePage, blogPage].filter(Boolean);

			const pagesWithReplacedPatterns = [];
			// Run these one page at a time so we don't end up with duplicate dependency issues
			for (const page of pagesToCreate) {
				const updatedPage = {
					...page,
					patterns: await replacePlaceholderPatterns(page.patterns),
				};
				pagesWithReplacedPatterns.push(updatedPage);
			}

			const pagesWithCustomContent = await generateCustomPageContent(
				pagesWithReplacedPatterns,
				{
					sitePlugins,
					siteType: siteTypeUpdated.name,
					siteInformation,
				},
				siteProfile,
			);

			const createdHomePage = pagesWithCustomContent.find(
				(p) => p.slug === 'home',
			);
			const heroPattern = createdHomePage?.patterns?.find((p) =>
				p.patternTypes?.includes('hero-header'),
			);
			const pMatch = heroPattern?.code?.match(/<p[^>]*>([\s\S]*?)<\/p>/);
			const heroDesc = pMatch?.[1]?.replace(/<[^>]+>/g, '').trim();
			setSiteStrings({
				...siteStrings,
				heroDescription: heroDesc || siteStrings?.heroDescription,
			});

			const createdPages = await createWpPages(pagesWithCustomContent, {
				stickyNav:
					siteStructure === 'single-page' && siteObjective !== 'landing-page',
			});

			if (needsBlog) {
				informDesc(__('Creating blog sample data', 'extendify-local'));
				await createBlogSampleData(siteStrings, siteImages);
			}

			await waitFor200Response();
			if (siteImages?.siteImages) {
				await setHelloWorldFeaturedImage(siteImages.siteImages);
			}

			if (needsImprintPage) {
				informDesc(__('Adding imprint page', 'extendify-local'));
				const createdImprintPage = await addImprintPage(style?.siteStyle);
				if (createdImprintPage) {
					createdPages.push(createdImprintPage);
					footerNavPages = [
						{
							name: createdImprintPage.title.rendered,
							slug: createdImprintPage.originalSlug,
							id: createdImprintPage.originalSlug,
							patterns: [],
						},
					];
				}
			}

			setPagesToAnimate([]);
			await waitFor200Response();
			informDesc(__('Setting up site layout', 'extendify-local'));

			const navPagesMultiPageSite = [...pages, blogPage, homePage].filter(
				Boolean,
			);

			const pluginPages = [];

			// Fetch active plugins after installing plugins
			const { data: activePlugins } = await getActivePlugins();

			// Add plugin related pages only if plugin is active
			if (wasPluginInstalled(activePlugins, 'woocommerce')) {
				const shopPageId = await getOption('woocommerce_shop_page_id');
				const shopPage = shopPageId
					? await getPageById(shopPageId).catch(() => null)
					: null;

				if (shopPage) {
					pluginPages.push(shopPage);
				}

				informDesc(__('Importing shop sample data', 'extendify-local'));
				try {
					await importTemporaryProducts();
				} catch (e) {
					console.error('Error importing temporary products', e);
				}

				// If we installed any plugins above, and a partner has supported plugins
				// linked to those plugins, we should install them here. For example:
				// A German specific WooCommerce plugin in case WooCommerce is installed.
				const partnerPlugins = await getPartnerPlugins('products').catch(
					() => null,
				);

				if (partnerPlugins) {
					informDesc(__('Installing supporting plugins', 'extendify-local'));
					for (const plugin of partnerPlugins) {
						if (!wasPluginInstalled(activePlugins, plugin)) {
							const maxAttempts = 2;
							await retryOperation(() => installPlugin(plugin), {
								maxAttempts,
							}).catch(console.error);

							recordPluginActivity({ slug: plugin, source: 'launch' });

							await retryOperation(() => activatePlugin(plugin), {
								maxAttempts,
							}).catch(console.error);
						}
					}
				}
			}

			if (wasPluginInstalled(activePlugins, 'the-events-calendar')) {
				const eventsPage = {
					title: {
						rendered: __('Events', 'extendify-local'),
					},
					slug: 'events',
					link: `${homeUrl}/events`,
				};

				pluginPages.push(eventsPage);
			}

			if (wasPluginInstalled(activePlugins, 'wpforms-lite')) {
				await updateOption('wpforms_activation_redirect', 'skip');
			}

			if (wasPluginInstalled(activePlugins, 'all-in-one-seo-pack')) {
				await updateOption('aioseo_activation_redirect', 'skip');
			}

			if (wasPluginInstalled(activePlugins, 'google-analytics-for-wordpress')) {
				await updateOption(
					'_transient__monsterinsights_activation_redirect',
					null,
				);
			}

			const pagesWithLinksUpdated =
				siteStructure === 'single-page'
					? await updateSinglePageLinksToSections(
							createdPages,
							pagesWithCustomContent,
							{
								linkOverride: CTALink,
								siteObjective,
							},
						)
					: await updateButtonLinks(createdPages, pluginPages);

			if (siteObjective !== 'landing-page') {
				if (siteStructure === 'single-page') {
					await addSectionLinksToNav(
						navigationId,
						homePage?.patterns,
						pluginPages,
						createdPages,
					);
				} else {
					await addPageLinksToNav(
						navigationId,
						navPagesMultiPageSite,
						pagesWithLinksUpdated,
						pluginPages,
					);
				}
				if (footerNavigationId) {
					await addPageLinksToNav(
						footerNavigationId,
						footerNavPages,
						pagesWithLinksUpdated,
						[],
					);
				}
			}

			await waitFor200Response();

			const renderingModes =
				select('core/preferences').get('core', 'renderingModes') || {};

			if (renderingModes?.extendable?.page !== 'template-locked') {
				dispatch('core/preferences').set('core', 'renderingModes', {
					...renderingModes,
					extendable: {
						...(renderingModes.extendable || {}),
						page: 'template-locked',
					},
				});
			}

			inform(__('Setting up your Site Assistant', 'extendify-local'));
			informDesc(__('Helping you to succeed', 'extendify-local'));
			await new Promise((resolve) => setTimeout(resolve, 1000));
			await waitFor200Response();
			inform(__('Your website has been created!', 'extendify-local'));
			informDesc(__('Redirecting in 3, 2, 1...', 'extendify-local'));
			// fire confetti here
			setConfettiReady(true);
			setWarnOnLeaveReady(false);
			await new Promise((resolve) => setTimeout(resolve, 2500));

			await waitFor200Response();
		} catch (e) {
			console.error(e);
			// if the error is 4xx, we should stop trying and prompt them to reload
			if (e.status >= 400 && e.status < 500) {
				setWarnOnLeaveReady(false);
				const alertMsg = __(
					'We encountered a server error we cannot recover from. Please reload the page and try again.',
					'extendify-local',
				);
				alert(alertMsg);
				location.href = adminUrl;
			}
			await new Promise((resolve) => setTimeout(resolve, 2000));
			return doEverything();
		}
	}, [
		pages,
		style,
		siteType,
		siteInformation,
		setPagesToAnimate,
		siteStructure,
		variation,
		siteProfile,
		siteStrings,
		siteImages,
		customFontFamilies,
		setUserGaveConsent,
		siteObjective,
		CTALink,
		logoUrl,
		sitePlugins,
		siteQA,
		setSiteStrings,
	]);

	useEffect(() => {
		if (logoLoading) return;
		if (shouldLoadPages && !pagesLoaded) return;
		doEverything().then(async () => {
			setPage(0);
			// This will trigger the post launch php functions.
			await postLaunchFunctions();
			// This loads the admin in the background to run php functions in admin context
			setLoadAdmin(true);
			await waitFor200Response();
			window.location.replace(redirectUrl);
		});
	}, [
		doEverything,
		setPage,
		logoLoading,
		redirectUrl,
		shouldLoadPages,
		pagesLoaded,
	]);

	useEffect(() => {
		const documentStyles = window.getComputedStyle(document.body);
		const partnerBg = documentStyles?.getPropertyValue('--ext-banner-main');
		const partnerText = documentStyles?.getPropertyValue('--ext-banner-text');
		if (partnerBg) {
			setConfettiColors([
				colord(partnerBg).darken(0.3).toHex(),
				colord(partnerText).alpha(0.5).toHex(),
				colord(partnerBg).lighten(0.2).toHex(),
			]);
		}
	}, []);

	useConfetti(
		{
			particleCount: 3,
			angle: 320,
			spread: 220,
			origin: { x: 0, y: 0 },
			colors: confettiColors,
		},
		2500,
		confettiReady,
	);

	return (
		<>
			<Transition
				as="div"
				show={isShowing}
				appear={true}
				enter="transition-all ease-in-out duration-500"
				enterFrom="md:w-40vw md:max-w-md"
				enterTo="md:w-full md:max-w-full"
				className="flex shrink-0 flex-col justify-between bg-banner-main px-10 py-12 text-banner-text md:h-screen"
			>
				<div className="max-w-prose">
					<div className="md:min-h-48">
						{partnerLogo ? (
							<div className="mb-8">
								<img
									style={{ maxWidth: '200px' }}
									src={partnerLogo}
									alt={partnerName ?? ''}
								/>
							</div>
						) : (
							<Logo className="logo mb-8 w-32 text-banner-text sm:w-40" />
						)}
						<div data-test="message-area">
							{info.map((step, index) => {
								if (index) return null;
								return (
									<Transition
										as="div"
										appear={true}
										show={isShowing}
										enter="transition-opacity duration-1000"
										enterFrom="opacity-0"
										enterTo="opacity-100"
										leave="transition-opacity duration-1000"
										leaveFrom="opacity-100"
										leaveTo="opacity-0"
										className="flex items-center space-x-4 text-4xl"
										key={step}
									>
										{step}
									</Transition>
								);
							})}
							<div className="mt-6 flex items-center space-x-4">
								<Spinner className="spin rtl:ml-3" />
								{infoDesc.map((step, index) => {
									if (index) return null;
									return (
										<Transition
											as="div"
											appear={true}
											show={isShowing}
											enter="transition-opacity duration-1000"
											enterFrom="opacity-0"
											enterTo="opacity-100"
											leave="transition-opacity duration-1000"
											leaveFrom="opacity-100"
											leaveTo="opacity-0"
											className="text-lg"
											key={step}
										>
											{step}
										</Transition>
									);
								})}
							</div>
							{pagesToAnimate.length > 0 ? (
								<PagesSkeleton pages={pagesToAnimate} />
							) : null}
						</div>
					</div>
				</div>
			</Transition>
			{loadAdmin ? <AdminLoader /> : null}
		</>
	);
};

// iframe that loads the admin in the background to make sure
// all php functions that require admin context work properly.
const AdminLoader = () => (
	<iframe
		title="Admin Loader"
		src={adminUrl}
		style={{ display: 'none' }}
		sandbox="allow-same-origin allow-scripts allow-forms"
	/>
);
