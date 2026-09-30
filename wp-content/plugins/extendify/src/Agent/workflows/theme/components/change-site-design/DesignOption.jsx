import { useIframeScale } from '@agent/hooks/useIframeScale';
import { removeAnimationClasses } from '@agent/workflows/theme/components/change-site-design/utils/removeAnimationClasses';
import { useMemo } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import classnames from 'classnames';
import { colord } from 'colord';

const PREVIEW_VIEWPORT_WIDTH = 1440;
const PREVIEW_VIEWPORT_HEIGHT = 1024;

const lowerImageQuality = (html) =>
	html.replace(
		/(https?:\/\/\S+\?w=\d+)/gi,
		'$1&q=10&auto=format,compress&fm=avif',
	);

// Clone duotone SVG filters from the page and adjust colors for this variation
const getDuotoneSvgNodes = (duotoneTheme) => {
	const duotoneMap = new Map(
		(duotoneTheme ?? []).map((item) => [item.slug, item]),
	);

	return [
		...document.querySelectorAll('svg:has(filter[id^="wp-duotone"])'),
	].map((svg) => {
		const cloned = svg.cloneNode(true);

		cloned.querySelectorAll('filter[id^="wp-duotone"]').forEach((filter) => {
			const preset = duotoneMap.get(filter.id.replace('wp-duotone-', ''));

			if (!preset?.colors || preset.colors.length !== 2) return;

			const [dark, light] = preset.colors.map((hex) => {
				const { r, g, b } = colord(hex).toRgb();
				return { r: r / 255, g: g / 255, b: b / 255 };
			});

			['feFuncR', 'feFuncG', 'feFuncB'].forEach((func, i) => {
				const ch = ['r', 'g', 'b'][i];
				filter
					.querySelector(func)
					?.setAttribute('tableValues', `${dark[ch]} ${light[ch]}`);
			});
		});
		return cloned;
	});
};

const generatePreviewHtml = (renderedHtml, styles) => {
	const clone = document.documentElement.cloneNode(true);
	const head = clone.querySelector('head');
	const body = clone.querySelector('body');

	// Strip all scripts
	clone.querySelectorAll('script').forEach((el) => {
		el.remove();
	});

	clone.querySelector('#block-style-variation-styles-inline-css')?.remove();
	clone.querySelector('#extendify-palette-preview-css')?.remove();
	clone.querySelector('#admin-bar-inline-css')?.remove();
	clone.querySelector('#admin-bar-css')?.remove();
	clone.querySelector('#extendify-toolbar-reset')?.remove();
	body.classList.remove('admin-bar');

	// Inject variation styles
	const styleEl = head.appendChild(document.createElement('style'));
	styleEl.textContent = [
		styles?.colorAndFontsVariations ?? '',
		// Ties the option on specificity, so it only wins by coming after it.
		styles?.paletteCss ?? '',
		styles?.vibes ?? '',
		styles?.blockSupportsCss ?? '',
	].join('\n');

	// Inject link styles
	(styles?.linkStyles ?? []).forEach((href) => {
		if (clone.querySelector(`link[href="${href}"]`)) return;

		const link = document.createElement('link');

		link.rel = 'stylesheet';
		link.href = href;

		head.appendChild(link);
	});

	const duotoneSvgNodes = getDuotoneSvgNodes(styles?.duotoneTheme);

	// Set body to header + hero section, then append duotone SVGs
	body.removeAttribute('style');

	const headerNode = removeAnimationClasses(document.querySelector('header'));
	headerNode?.classList.remove('is-past-hero', 'is-scrolled');
	headerNode?.removeAttribute('style');
	const headerHtml = headerNode?.outerHTML ?? '';
	body.innerHTML = `${headerHtml}<div class="entry-content">${lowerImageQuality(renderedHtml)}</div>`;
	duotoneSvgNodes.forEach((node) => {
		body.appendChild(node);
	});

	return `<!DOCTYPE html>${clone.outerHTML}`;
};

export const DesignOption = ({ renderedHtml, styles, isSelected, onClick }) => {
	const { containerRef, scale, contentHeight, handleIframeLoad } =
		useIframeScale({ viewportWidth: PREVIEW_VIEWPORT_WIDTH });

	const srcdoc = useMemo(
		() => generatePreviewHtml(renderedHtml, styles),
		[
			renderedHtml,
			styles?.linkStyles,
			styles?.colorAndFontsVariations,
			styles?.paletteCss,
			styles?.duotoneTheme,
			styles?.vibes,
			styles?.blockSupportsCss,
		],
	);

	return (
		<button
			ref={containerRef}
			type="button"
			style={{
				height: `${(contentHeight ?? PREVIEW_VIEWPORT_HEIGHT) * scale}px`,
			}}
			className={classnames(
				'relative w-full cursor-pointer overflow-hidden rounded-md border shadow-md',
				{
					'border-design-main ring-wp ring-design-main': isSelected,
					'border-gray-400': !isSelected,
				},
			)}
			onClick={onClick}
			onKeyDown={(e) => e.key === 'Enter' && onClick()}
		>
			<div
				className="overflow-hidden"
				style={{
					width: PREVIEW_VIEWPORT_WIDTH,
					transform: `scale(${scale})`,
					transformOrigin: 'top left',
				}}
			>
				<iframe
					title={__('Preview site design', 'extendify-local')}
					onLoad={handleIframeLoad}
					srcDoc={srcdoc}
					style={{
						width: '100%',
						height: Math.max(
							contentHeight ?? PREVIEW_VIEWPORT_HEIGHT,
							PREVIEW_VIEWPORT_HEIGHT,
						),
						border: 0,
						pointerEvents: 'none',
						display: 'block',
						overflow: 'hidden',
					}}
				/>
			</div>
		</button>
	);
};
