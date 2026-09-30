import { usePaletteOverride } from '@agent/hooks/usePaletteOverride';
import { usePalettes } from '@agent/hooks/usePalettes';
import { useSiteVibesOverride } from '@agent/hooks/useSiteVibesOverride';
import { useSiteVibesVariations } from '@agent/hooks/useSiteVibesVariations';
import { useVariationOverride } from '@agent/hooks/useVariationOverride';
import { refreshBlockHighlight } from '@agent/lib/block-highlight';
import { DesignOption } from '@agent/workflows/theme/components/change-site-design/DesignOption';
import { fontsOnlyVariation } from '@agent/workflows/theme/components/change-site-design/utils/fontsOnlyVariation';
import { removeAnimationClasses } from '@agent/workflows/theme/components/change-site-design/utils/removeAnimationClasses';
import { handleSiteImages } from '@auto-launch/fetchers/get-images';
import { useUserSelectionStore } from '@launch/state/user-selections';
import { paletteDuotone } from '@shared/lib/palette-preview';
import { samplePalettes } from '@shared/lib/palettes';
import { safeParseJson } from '@shared/lib/parsing';
import { normalizeSiteImages } from '@shared/lib/site-images';
import apiFetch from '@wordpress/api-fetch';
import { registerCoreBlocks } from '@wordpress/block-library';
import { getBlockTypes, parse, serialize } from '@wordpress/blocks';
import { Spinner } from '@wordpress/components';
import { useDispatch } from '@wordpress/data';
import { useEffect, useMemo, useRef, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import classnames from 'classnames';

let originalHeroElement = null;

const undoHeroSectionChange = () => {
	const preview = document.querySelector('.ext-hero-section-preview');
	if (preview && originalHeroElement) {
		preview.replaceWith(originalHeroElement);
	} else {
		preview?.remove();
	}
	originalHeroElement = null;
};

const updateHeroSection = (content) => {
	const tempDiv = document.createElement('div');
	tempDiv.innerHTML = content;
	const newNode = tempDiv.firstElementChild;
	newNode.classList.add('ext-hero-section-preview');

	const existingPreview = document.querySelector('.ext-hero-section-preview');
	if (existingPreview) {
		existingPreview.replaceWith(newNode);
		return;
	}

	const heroSectionElement = document.querySelector('.ext-hero-section');
	if (heroSectionElement) {
		originalHeroElement = heroSectionElement;
		heroSectionElement.replaceWith(newNode);
		return;
	}

	const contentArea =
		document.querySelector('.entry-content') ?? document.querySelector('main');
	if (!contentArea) return;
	contentArea.insertAdjacentElement('afterbegin', newNode);
};

const { context } = window.extAgentData;
const isAdmin = context?.adminPage;

const PAGE_SIZE = 5;

const hasImages = ({ hero, general }) => hero.length > 0 || general.length > 0;

const resolveSiteImages = async ({ storedSiteImages, siteProfile }) => {
	const stored = normalizeSiteImages(storedSiteImages);
	if (hasImages(stored)) return stored;

	// A browser that didn't run Launch otherwise reuses one image on every option.
	const localized = normalizeSiteImages(window.extSharedData.siteImages);
	if (hasImages(localized)) return localized;

	if (siteProfile) {
		const { siteImages } = await handleSiteImages({ siteProfile });
		const fetched = normalizeSiteImages(siteImages);
		if (hasImages(fetched)) return fetched;
	}

	const saved = await apiFetch({
		path: '/extendify/v1/shared/site-images',
	}).catch(() => null);

	return normalizeSiteImages(saved?.siteImages);
};

export const SelectSiteDesign = ({ onConfirm, onCancel }) => {
	const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
	const [isLoading, setIsLoading] = useState(false);
	const [isSaving, setIsSaving] = useState(false);

	const [heroPatterns, setHeroPatterns] = useState();
	const [colorAndFontsVariations, setColorAndFontsVariations] = useState();
	const [blockEditorStyles, setBlockEditorStyles] = useState();
	const [currentHeroHtml, setCurrentHeroHtml] = useState();
	const [currentCssVibe, setCurrentCssVibe] = useState();

	const [selectedColorAndFonts, setSelectedColorAndFonts] = useState();
	const [selectedHeroPattern, setSelectedHeroPattern] = useState();
	const [selectedVibe, setSelectedVibe] = useState();
	const [selectedPalette, setSelectedPalette] = useState();

	const { updateSettings } = useDispatch('core/block-editor');

	const injectedLinksRef = useRef([]);

	const injectLinkStyles = (linkStyles) => {
		injectedLinksRef.current.forEach((link) => {
			link.remove();
		});
		injectedLinksRef.current = [];

		(linkStyles ?? []).forEach((href) => {
			if (document.querySelector(`link[href="${href}"]`)) return;
			const link = document.createElement('link');
			link.rel = 'stylesheet';
			link.href = href;
			document.head.appendChild(link);
			injectedLinksRef.current.push(link);
		});
	};

	const removeInjectedLinks = () => {
		injectedLinksRef.current.forEach((link) => {
			link.remove();
		});
		injectedLinksRef.current = [];
	};

	const {
		palettes,
		preferred,
		css: paletteCss,
		isLoading: isLoadingPalettes,
	} = usePalettes();
	const onPalettes = Boolean(palettes?.length);
	const shownPalettes = useMemo(
		() => samplePalettes(palettes, preferred),
		[palettes, preferred],
	);
	const paletteFor = (index) =>
		onPalettes ? shownPalettes[index % shownPalettes.length] : undefined;

	const { undoChange: undoColorAndFontsChange } = useVariationOverride({
		css: !isAdmin && selectedColorAndFonts?.css,
		duotoneTheme:
			!isAdmin &&
			!onPalettes &&
			selectedColorAndFonts?.settings?.color?.duotone?.theme,
	});

	const { undoChange: undoPaletteChange } = usePaletteOverride({
		css: (!isAdmin && paletteCss?.[selectedPalette?.slug]) || '',
		duotoneTheme: (!isAdmin && paletteDuotone(selectedPalette)) || null,
	});

	const { undoChange: undoVibesChange } = useSiteVibesOverride({
		css: !isAdmin && selectedVibe?.css,
		slug: !isAdmin && selectedVibe?.slug,
	});

	const { data: vibesData, isLoading: isLoadingVibes } =
		useSiteVibesVariations();

	const vibes = useMemo(() => {
		// Null for a theme with no block variations, which .css would throw on.
		if (isLoadingVibes || !vibesData?.css) return [];

		const vibes = Object.entries(vibesData.css)
			.filter(([slug]) => slug !== vibesData.currentVibe)
			.map(([slug, css]) => ({
				slug,
				css: css?.replaceAll(slug, 'natural-1'),
				// Css only adds, so a cloned page keeps the applied vibe's slots.
				previewCss: `${vibesData.resets?.[slug] ?? ''}${css ?? ''}`.replaceAll(
					slug,
					'natural-1',
				),
			}))
			.sort(() => Math.random() - 0.5);

		return [...vibes, ...vibes.slice(0, 3)];
	}, [vibesData, isLoadingVibes]);

	useEffect(() => {
		window.scrollTo({ top: 0, behavior: 'smooth' });
		const heroEl = document.querySelector('.ext-hero-section');
		const cssVibeEl = document.getElementById(
			'block-style-variation-styles-inline-css',
		);

		if (heroEl) setCurrentHeroHtml(removeAnimationClasses(heroEl).outerHTML);
		if (cssVibeEl) setCurrentCssVibe(cssVibeEl.textContent);
	}, []);

	useEffect(() => {
		setIsLoading(true);

		const heroSectionElement = document.querySelector('.ext-hero-section');

		const title = heroSectionElement?.querySelector('h1')?.textContent ?? null;
		const description =
			heroSectionElement?.querySelector('p')?.textContent ?? null;
		const cta =
			heroSectionElement?.querySelector('.wp-block-button__link') ?? null;
		const heroPatternName =
			heroSectionElement?.className?.match(
				/ext-hero-section ext-hero-section--(\S+)/,
			)?.[1] ?? null;
		const domImages = [...(heroSectionElement?.querySelectorAll('img') ?? [])]
			.filter(
				(img) =>
					!img.src.includes('.svg') && !img.src.includes('data:image/svg+xml'),
			)
			.map((img) => {
				try {
					const url = new URL(img.src);
					return url.origin + url.pathname;
				} catch {
					return img.src;
				}
			});

		const { siteId } = window.extSharedData;
		const stored = safeParseJson(
			localStorage.getItem(`extendify-launch-data-${siteId}`),
		);
		const launchState = useUserSelectionStore.getState();
		const storedSiteImages =
			stored?.state?.siteImages ?? launchState?.siteImages?.siteImages ?? [];
		const siteProfile = stored?.state?.siteProfile ?? launchState?.siteProfile;

		(async () => {
			const siteImages = await resolveSiteImages({
				storedSiteImages,
				siteProfile,
			});

			apiFetch({
				path: '/extendify/v1/agent/site-design-variations',
				method: 'POST',
				data: {
					title,
					images: domImages,
					siteImages,
					postId: context?.postId,
					description,
					currentHeroPattern: heroPatternName,
					source: 'change-site-design-workflow',
					cta: {
						label: cta?.textContent,
						link: cta?.href,
					},
				},
			})
				.then((data) => {
					setHeroPatterns(data?.patterns?.flat() ?? []);
					setColorAndFontsVariations(
						[...(data?.colorAndFontsVariations ?? [])].sort(
							() => Math.random() - 0.5,
						),
					);

					setBlockEditorStyles(data?.blockEditorSettings);
				})
				.finally(() => {
					setIsLoading(false);
				});
		})();
	}, []);

	useEffect(() => {
		if (blockEditorStyles) {
			updateSettings(blockEditorStyles);
		}
	}, [blockEditorStyles, updateSettings]);

	const currentDesignOption = useMemo(
		() => ({ id: 'current', isCurrent: true, renderedHtml: currentHeroHtml }),
		[currentHeroHtml],
	);

	useEffect(() => {
		if (currentDesignOption) setSelectedHeroPattern(currentDesignOption);
	}, [currentDesignOption]);

	const visibleHeroPatterns = heroPatterns?.slice(0, visibleCount);
	const hasMore = visibleCount < heroPatterns?.length;

	const undoChanges = () => {
		undoHeroSectionChange();
		undoColorAndFontsChange();
		undoPaletteChange();
		undoVibesChange();
		removeInjectedLinks();
		refreshBlockHighlight();
	};

	const confirmed = useRef(false);
	useEffect(() => {
		return () => {
			if (!confirmed.current) undoChanges();
		};
	}, []);

	const handleCancel = () => {
		undoChanges();
		onCancel();
	};

	const handleConfirm = async () => {
		if (!selectedHeroPattern) return;

		if (selectedHeroPattern.isCurrent) {
			confirmed.current = true;
			onConfirm({
				data: { postId: context?.postId },
				shouldRefreshPage: false,
			});
			return;
		}

		if (!selectedVibe || !selectedColorAndFonts) return;

		const postId = context?.postId;

		try {
			const page = await apiFetch({
				path: `/wp/v2/pages/${postId}?context=edit`,
			});

			// parse() depends on block types being registered
			if (getBlockTypes().length === 0) registerCoreBlocks();

			const pageBlocks = parse(page.content.raw);

			let heroPatternUpdated = false;
			const updatedPageBlocks = serialize(
				pageBlocks.map((block) => {
					if (
						heroPatternUpdated ||
						!block.attributes.className.split(' ').includes('ext-hero-section')
					)
						return block;

					heroPatternUpdated = true;

					return parse(selectedHeroPattern.code)?.[0] || block;
				}),
			);

			confirmed.current = true;
			onConfirm({
				data: {
					updatedPageBlocks,
					postId,
					vibeSlug: selectedVibe.slug,
					colorAndFontsVariation: onPalettes
						? fontsOnlyVariation(selectedColorAndFonts)
						: selectedColorAndFonts,
					colorPalette: selectedPalette?.slug,
				},
				shouldRefreshPage: true,
			});
		} catch (error) {
			console.log(error);
		} finally {
			setIsSaving(false);
		}
	};

	if (isLoading || isLoadingVibes || isLoadingPalettes) {
		return (
			<div className="min-h-24 p-2 text-center text-sm">
				{__('Loading design options...', 'extendify-local')}
			</div>
		);
	}

	return (
		<div className="mb-4 ms-2 me-2 flex flex-col rounded-lg border border-gray-300 bg-gray-50">
			<div className="rounded-lg border-b border-gray-300 bg-white">
				<div className="flex flex-col gap-4 p-3">
					{currentHeroHtml && (
						<DesignOption
							renderedHtml={currentHeroHtml}
							isSelected={selectedHeroPattern?.id === 'current'}
							styles={{ vibes: currentCssVibe }}
							onClick={() => {
								setSelectedHeroPattern(currentDesignOption);
								setSelectedColorAndFonts(null);
								setSelectedVibe(null);
								setSelectedPalette(null);

								undoChanges();
							}}
						/>
					)}
					{visibleHeroPatterns?.map((heroPattern, i) => (
						<DesignOption
							key={heroPattern.id}
							renderedHtml={heroPattern.renderedHtml}
							isSelected={selectedHeroPattern?.id === heroPattern.id}
							styles={{
								linkStyles: heroPattern.linkStyles,
								colorAndFontsVariations: colorAndFontsVariations[i].css,
								paletteCss: paletteCss?.[paletteFor(i)?.slug],
								duotoneTheme: onPalettes
									? paletteDuotone(paletteFor(i))
									: colorAndFontsVariations[i]?.settings?.color?.duotone?.theme,
								vibes: vibes[i]?.previewCss,
								blockSupportsCss: heroPattern.blockSupportsCss,
							}}
							onClick={() => {
								setSelectedHeroPattern(heroPattern);
								setSelectedColorAndFonts(colorAndFontsVariations[i]);
								setSelectedVibe(vibes[i]);
								setSelectedPalette(paletteFor(i));

								if (!isAdmin) {
									const blockSupportsCss = heroPattern.blockSupportsCss;
									if (blockSupportsCss) {
										let el = document.getElementById('ext-block-supports-css');
										if (!el) {
											el = document.createElement('style');
											el.id = 'ext-block-supports-css';
											document.head.appendChild(el);
										}
										el.textContent = blockSupportsCss;
									}

									injectLinkStyles(heroPattern.linkStyles);

									updateHeroSection(heroPattern.renderedHtml);
									refreshBlockHighlight();
								}
							}}
						/>
					))}

					{hasMore && (
						<button
							type="button"
							className={classnames(
								'w-full rounded-sm border border-gray-300 bg-white p-2 text-sm text-gray-800',
								{
									'hover:bg-gray-50': !isSaving,
								},
							)}
							onClick={() => setVisibleCount((value) => value + PAGE_SIZE)}
							disabled={isSaving}
						>
							{__('Load more', 'extendify-local')}
						</button>
					)}
				</div>
			</div>
			<div className="flex justify-start gap-2 p-3">
				<button
					type="button"
					className={classnames(
						'w-full rounded-sm border border-gray-300 bg-white p-2 text-sm text-gray-800',
						{
							'hover:bg-gray-50': !isSaving,
						},
					)}
					onClick={handleCancel}
					disabled={isSaving}
				>
					{__('Cancel', 'extendify-local')}
				</button>
				<button
					type="button"
					className={classnames(
						'w-full rounded-sm border border-design-main bg-design-main p-2 text-sm text-white',
						{
							'cursor-not-allowed': !selectedHeroPattern || isSaving,
							'hover:bg-gray-800': !isSaving,
						},
					)}
					disabled={!selectedHeroPattern || isSaving}
					onClick={handleConfirm}
				>
					{isSaving ? (
						<Spinner className="m-0" />
					) : (
						__('Save', 'extendify-local')
					)}
				</button>
			</div>
		</div>
	);
};
