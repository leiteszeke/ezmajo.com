import { getThemeVariations } from '@launch/api/WPApi';
import { LoadingIndicator } from '@launch/components/LoadingIndicator';
import { SmallPreview } from '@launch/components/SmallPreview';
import { Title } from '@launch/components/Title';
import { useFetch } from '@launch/hooks/useFetch';
import { useHomeLayouts } from '@launch/hooks/useHomeLayouts';
import { useIsMountedLayout } from '@launch/hooks/useIsMounted';
import { PageLayout } from '@launch/layouts/PageLayout';
import { pageState } from '@launch/state/factory';
import { usePagesSelectionStore } from '@launch/state/pages-selections';
import { useUserSelectionStore } from '@launch/state/user-selections';
import { Checkmark } from '@launch/svg';
import { deepMerge } from '@shared/lib/utils';
import { useCallback, useEffect, useRef, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import classNames from 'classnames';
import { AnimatePresence, motion } from 'framer-motion';

export const state = pageState('Layout', () => ({
	ready: false,
	canSkip: false,
	useNav: true,
	onRemove: () => {},
}));

export const HomeSelect = () => {
	const { loading, homeLayouts } = useHomeLayouts();

	return (
		<PageLayout>
			<div className="grow overflow-y-auto px-6 py-8 md:p-12 3xl:p-16">
				<Title
					title={__('Pick a design for your website', 'extendify-local')}
					description={__('You can personalize this later.', 'extendify-local')}
				/>
				<div className="relative mx-auto w-full max-w-6xl">
					{loading ? (
						<LoadingIndicator />
					) : (
						<DesignSelector homeLayouts={homeLayouts} />
					)}
				</div>
			</div>
		</PageLayout>
	);
};

const DesignSelector = ({ homeLayouts }) => {
	const { data: variations } = useFetch('variations', getThemeVariations);
	const isMounted = useIsMountedLayout();
	const [styles, setStyles] = useState([]);
	const { setStyle, style: currentStyle } = usePagesSelectionStore();

	const { siteInformation, siteObjective, setVariation, variation } =
		useUserSelectionStore();

	const onSelect = useCallback(
		(style) => {
			setStyle(style);
			setVariation(style?.variation);
		},
		[setStyle, setVariation],
	);
	const wrapperRef = useRef();
	const once = useRef(false);

	useEffect(() => {
		state.setState({ ready: !!variation?.title });
	}, [variation]);

	useEffect(() => {
		if (!homeLayouts || !variations) return;
		if (styles.length) return;
		setStyle(null);
		setVariation(null);
		(async () => {
			const slicedEntries = Array.from(homeLayouts.entries());
			for (const [index, style] of slicedEntries) {
				if (!isMounted.current) return;

				const { fonts, colorPalette } = style.siteStyle;

				// Select the variation matching the color palette suggested
				// by the AI. If none matches, return a random variation.
				let variation =
					variations.find(({ slug }) => slug === colorPalette) ??
					variations[index % variations.length];

				// If a variation matched color palette, replace the fonts with
				// those suggested by the AI.
				if (variation.slug === colorPalette && fonts) {
					variation = deepMerge(variation, {
						styles: {
							elements: {
								heading: {
									typography: {
										fontFamily: `var(--wp--preset--font-family--${fonts.heading.slug})`,
									},
								},
							},
							typography: {
								fontFamily: `var(--wp--preset--font-family--${fonts.body.slug})`,
							},
						},
						settings: {
							typography: {
								fontFamilies: {
									// If font doesn't have a host, it means it's already installed
									// with the theme. We only need to add the ones that are not.
									custom: [fonts.heading, fonts.body].filter(
										(font) => !!font.host,
									),
								},
							},
						},
					});
				}

				setStyles((styles) => [
					...styles,
					{
						...style,
						variation,
					},
				]);

				// Delay between 350ms and 1s to make it less rigid
				const random = Math.floor(Math.random() * (1000 - 150 + 1)) + 150;
				await new Promise((resolve) => setTimeout(resolve, random));
			}
		})();
	}, [
		homeLayouts,
		isMounted,
		variations,
		styles.length,
		setStyle,
		setVariation,
	]);

	useEffect(() => {
		if (!currentStyle || !styles || once.current) return;
		const currentButton = wrapperRef.current?.querySelector(
			`#layout-style-${currentStyle.slug} [role="button"]`,
		);
		if (!currentButton) return;
		once.current = true;
		currentButton.focus();
	}, [currentStyle, styles]);

	return (
		<div
			className="grid gap-8 md:grid-cols-2 lg:grid-cols-3"
			data-test="layout-preview-wrapper"
			ref={wrapperRef}
		>
			{styles?.map((style) => (
				<div className="relative" key={style.id}>
					<AnimatePresence>
						<motion.div
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							duration={0.7}
							className={classNames(
								'relative cursor-pointer overflow-hidden rounded-sm border border-gray-200 ring-offset-2 ring-offset-white focus-within:outline-hidden focus-within:ring-4 focus-within:ring-design-main focus-within:ring-offset-2 focus-within:ring-offset-white hover:outline-hidden hover:ring-4',
								{
									'ring-4 ring-design-main ring-offset-2 ring-offset-white hover:ring-design-main':
										currentStyle?.id === style.id,
									'hover:ring-gray-300': currentStyle?.id !== style.id,
								},
							)}
							style={{ aspectRatio: '1.55' }}
						>
							<SmallPreview
								style={style}
								showNav={siteObjective !== 'landing-page'}
								siteTitle={siteInformation.title}
								onSelect={onSelect}
								selected={currentStyle?.id === style.id}
							/>
						</motion.div>
					</AnimatePresence>
					<span aria-hidden="true">
						{currentStyle?.id === style.id ? (
							<Checkmark className="absolute right-0 top-0 z-50 m-2 h-6 w-6 -translate-y-5 translate-x-5 rounded-full bg-design-main text-design-text" />
						) : null}
					</span>
				</div>
			))}
			{homeLayouts?.slice(styles?.length).map((_, i) => (
				<AnimatePresence key={i}>
					<motion.div
						initial={{ opacity: 1 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						duration={0.7}
						className="relative bg-gray-50"
						style={{
							aspectRatio: '1.55',
							backgroundImage:
								'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.5) 50%, rgba(255,255,255,0) 100%)',
							backgroundSize: '600% 600%',
							animation: 'extendify-loading-skeleton 10s ease-in-out infinite',
						}}
					/>
				</AnimatePresence>
			))}
		</div>
	);
};
