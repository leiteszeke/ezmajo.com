import themeJSON from '@launch/_data/theme-processed.json';
import { usePreviewIframe } from '@launch/hooks/usePreviewIframe';
import { useVibeCss } from '@launch/hooks/useVibeCss';
import { getFontOverrides } from '@launch/lib/preview-helpers';
import { hexTomatrixValues, lowerImageQuality } from '@launch/lib/util';
import { pageNames } from '@shared/lib/pages';
import { BlockPreview } from '@wordpress/block-editor';
import { rawHandler } from '@wordpress/blocks';
import {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import classNames from 'classnames';
import { colord } from 'colord';
import { AnimatePresence, motion } from 'framer-motion';

export const SmallPreview = ({
	style,
	onSelect,
	selected,
	siteTitle,
	showNav = true,
}) => {
	const previewContainer = useRef(null);
	const blockRef = useRef(null);
	const observer = useRef(null);
	const [ready, setReady] = useState(false);
	const variation = style?.variation;
	const theme = variation?.settings?.color?.palette?.theme;
	const vibe = useMemo(() => style?.siteStyle?.vibe, [style?.siteStyle?.vibe]);
	const { data: vibeCss } = useVibeCss();
	const blockVariationCSS = useMemo(
		() => vibeCss?.[vibe] ?? vibeCss?.['natural-1'] ?? '',
		[vibe, vibeCss],
	);

	const onLoad = useCallback(
		(frame) => {
			// Run this 150 times at an interval of 100ms (15s)
			// This is a brute force check that the styles are there
			let lastRun = performance.now();
			let counter = 0;
			const variationTitle = variation?.slug
				?.split('-')
				.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
				.join(' ');

			const variationStyles = themeJSON[variationTitle];
			const { customFontLinks, fontOverrides } = getFontOverrides(variation);

			const checkOnStyles = () => {
				if (counter >= 150) return;
				const now = performance.now();
				// Don't pass here until we've waited 100ms
				if (now - lastRun < 100) return requestAnimationFrame(checkOnStyles);
				lastRun = now;
				const content = frame?.contentDocument;
				if (content) {
					content.querySelector('[href*=load-styles]')?.remove();
					const siteTitleElement = content.querySelector('[href*=site-title]');
					if (siteTitleElement.textContent !== siteTitle) {
						siteTitleElement.textContent = siteTitle;
					}
				}
				const primaryColor = theme?.find(
					({ slug }) => slug === 'primary',
				)?.color;
				const [r, g, b] = primaryColor
					? hexTomatrixValues(primaryColor)
					: [0, 0, 0];

				// Add custom font links if not already present
				if (
					customFontLinks &&
					!frame.contentDocument?.querySelector('[id^="ext-custom-font"]')
				) {
					frame.contentDocument?.head?.insertAdjacentHTML(
						'beforeend',
						customFontLinks,
					);
				}

				if (!frame.contentDocument?.getElementById('ext-tj')) {
					frame.contentDocument?.body?.insertAdjacentHTML(
						'beforeend',
						`<style id="ext-tj">
							${variationStyles}
							${fontOverrides}
							${blockVariationCSS}
							.wp-block-missing { display: none !important }
							img.custom-logo, [class*=wp-duotone-] img[src^="data"] {
								filter: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"><filter id="solid-color"><feColorMatrix color-interpolation-filters="sRGB" type="matrix" values="0 0 0 0 ${r} 0 0 0 0 ${g} 0 0 0 0 ${b} 0 0 0 1 0"/></filter></svg>#solid-color') !important;
							}
						</style>`,
					);
				}

				counter++;
				requestAnimationFrame(checkOnStyles); // recursive
			};
			checkOnStyles();
		},
		[variation, theme, siteTitle, blockVariationCSS],
	);

	const { loading, ready: show } = usePreviewIframe({
		container: blockRef.current,
		ready,
		onLoad,
		// Additional time to wait after we think we are ready
		loadDelay: 750,
	});
	const blocks = useMemo(() => {
		const links = [
			pageNames.about.title,
			pageNames.blog.title,
			pageNames.contact.title,
		];

		const code = [
			style?.headerCode,
			style?.patterns
				.flatMap(({ code }) => code)
				.slice(0, 3)
				.join('\n'),
			style?.footerCode,
		]
			.filter(Boolean)
			.join('')
			.replace(
				// Replace natural-1 with dynamic vibe value
				/natural-1/g,
				vibe || 'natural-1',
			)
			.replace(
				// <!-- wp:navigation --> <!-- /wp:navigation -->
				/<!-- wp:navigation[.\S\s]*?\/wp:navigation -->/g,
				showNav
					? `<!-- wp:paragraph {"className":"tmp-nav"} --><p class="tmp-nav" style="display: flex; gap: 2rem; margin:0;">${links.map((link) => `<span>${link}</span>`).join('')}</p ><!-- /wp:paragraph -->`
					: '',
			)
			.replace(
				// <!-- wp:navigation /-->
				/<!-- wp:navigation.*\/-->/g,
				showNav
					? `<!-- wp:paragraph {"className":"tmp-nav"} --><p class="tmp-nav" style="display: flex; gap: 2rem; margin:0;">${links.map((link) => `<span>${link}</span>`).join('')}</p ><!-- /wp:paragraph -->`
					: '',
			)
			.replace(
				/<!--\s*wp:social-links\b[^>]*>.*?<!--\s*\/wp:social-links\s*-->/gis,
				// dont replace if showNav is true
				(match) => (showNav ? match : ''),
			)
			.replace(
				/<!-- wp:site-logo.*\/-->/g,
				'<!-- wp:paragraph {"className":"custom-logo"} --><p class="custom-logo" style="display:flex; align-items: center; margin:0;"><img alt="" class="custom-logo" style="height: 32px;" src="https://images.extendify-cdn.com/demo-content/logos/ext-custom-logo-default.webp"></p ><!-- /wp:paragraph -->',
			);
		return rawHandler({ HTML: lowerImageQuality(code) });
	}, [style?.headerCode, style?.patterns, style?.footerCode, vibe, showNav]);

	useEffect(() => {
		if (observer.current) return;
		observer.current = new IntersectionObserver((entries) => {
			entries[0].isIntersecting && setReady(true);
		});
		observer.current.observe(blockRef.current);
		return () => observer.current.disconnect();
	}, []);

	return (
		// biome-ignore lint: keep the button role until a refactor is done
		<div
			data-test="layout-preview"
			className="relative h-full w-full overflow-hidden"
			ref={blockRef}
			role={onSelect ? 'button' : undefined}
			tabIndex={onSelect ? 0 : undefined}
			aria-label={
				onSelect ? __('Press to select', 'extendify-local') : undefined
			}
			aria-selected={onSelect ? selected : undefined}
			onKeyDown={(e) => {
				if (!['Enter', 'Space', ' '].includes(e.key)) return;
				onSelect?.({ ...style, variation });
			}}
			onClick={() => onSelect?.({ ...style, variation })}
		>
			{ready ? (
				<motion.div
					ref={previewContainer}
					className={classNames('absolute inset-0 z-20', {
						'opacity-0': !show,
					})}
					initial={{ opacity: 0 }}
					animate={{ opacity: loading ? 0 : 1 }}
				>
					<BlockPreview
						blocks={blocks}
						viewportWidth={1400}
						additionalStyles={[
							// TODO: { css: themeJSON[style.variation.title] },
							{
								css: '.rich-text [data-rich-text-placeholder]:after { content: "" }',
							},
						]}
					/>
				</motion.div>
			) : null}
			<AnimatePresence>
				{show || (
					<motion.div
						initial={{ opacity: 0.7 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						transition={{ duration: 0.5 }}
						className="absolute inset-0 z-30"
						style={{
							backgroundColor: colord(
								theme?.find(({ slug }) => slug === 'primary')?.color ?? '#ccc',
							)
								.alpha(0.25)
								.toRgbString(),
							backgroundImage:
								'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.5) 50%, rgba(255,255,255,0) 100%)',
							backgroundSize: '600% 600%',
							animation: 'extendify-loading-skeleton 10s ease-in-out infinite',
						}}
					/>
				)}
			</AnimatePresence>
		</div>
	);
};
