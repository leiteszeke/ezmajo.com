import { usePalettes } from '@agent/hooks/usePalettes';
import { useVariationOverride } from '@agent/hooks/useVariationOverride';
import { useChatStore } from '@agent/state/chat';
import { remapPaletteDuotone } from '@shared/lib/palette-preview';
import { useEffect, useMemo, useRef, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

const colorsArrayToMap = (colors) => {
	const map = {};
	colors.forEach(({ slug, color }) => {
		map[slug] = color;
	});
	return map;
};

const getBackgroundColor = (colors) => {
	const bgSlugs = ['base', 'background', 'bg'];
	for (const slug of bgSlugs) {
		if (colors[slug]) return colors[slug];
	}
	return '#ffffff';
};

const buildPreviewCss = (colorsMap) => {
	const styleEl = document.getElementById('global-styles-inline-css');
	if (!styleEl) return '';
	let css = styleEl.innerHTML;
	Object.entries(colorsMap).forEach(([slug, hex]) => {
		const regex = new RegExp(
			`(--wp--preset--color--${slug}\\s*:\\s*)([^;]+)(;)`,
			'g',
		);
		css = css.replace(regex, `$1${hex}$3`);
	});
	return css;
};

const themeReference = () => {
	const presets = window.extAgentData?.context?.themePresets;
	return {
		colors: presets?.colors,
		settings: { color: { duotone: presets?.duotone } },
	};
};

export const SelectGeneratedPalette = ({
	inputs,
	onConfirm,
	onCancel,
	onRetry,
}) => {
	const [selected, setSelected] = useState(null);
	const [previewCss, setPreviewCss] = useState('');
	const { addMessage, messages } = useChatStore();
	const { applied } = usePalettes();
	const aiPalettes = inputs?.palettes;

	const palettes = useMemo(
		() =>
			aiPalettes?.map(({ name, colors }) => {
				return {
					name,
					colors: colorsArrayToMap(colors),
					colorsArray: colors,
				};
			}) || [],
		[aiPalettes],
	);
	const noPalettes = !aiPalettes?.length || palettes.length === 0;
	const selectedPalette = palettes.find(({ name }) => name === selected);

	// foreground-and-background is served-only; the theme never registers it.
	const duotoneTheme = useMemo(() => {
		if (!selectedPalette) return null;
		const reference = applied ?? themeReference();
		return remapPaletteDuotone(reference, selectedPalette.colors) ?? null;
	}, [applied, selectedPalette]);

	const { undoChange } = useVariationOverride({
		css: previewCss,
		duotoneTheme,
	});

	const confirmed = useRef(false);
	useEffect(() => {
		return () => {
			if (!confirmed.current) undoChange();
		};
	}, []);

	useEffect(() => {
		if (!noPalettes) return;
		const timer = setTimeout(() => onCancel(), 100);
		const content = __(
			'We were unable to generate color palettes. Please try again.',
			'extendify-local',
		);
		const last = messages.at(-1)?.details?.content;
		if (content === last) return () => clearTimeout(timer);
		addMessage('message', { role: 'assistant', content, error: true });
		return () => clearTimeout(timer);
	}, [addMessage, onCancel, noPalettes, messages]);

	const handleRetry = () => {
		undoChange();
		onRetry();
	};

	const handleConfirm = () => {
		if (!selectedPalette) return;
		confirmed.current = true;
		onConfirm({
			data: {
				palette: {
					name: selectedPalette.name,
					colors: selectedPalette.colorsArray.map(({ slug, color }) => ({
						slug,
						color,
						name: slug,
					})),
				},
				duotone: duotoneTheme,
			},
			shouldRefreshPage: true,
		});
	};

	if (noPalettes) return null;

	return (
		<div className="mb-4 ms-2 me-2 flex flex-col rounded-lg border border-gray-300 bg-gray-50">
			<div className="rounded-lg border-b border-gray-300 bg-white">
				<div className="grid grid-cols-2 gap-2 p-3">
					{palettes.map(({ name, colors, colorsArray }) => (
						<button
							key={name}
							type="button"
							style={{ backgroundColor: getBackgroundColor(colors) }}
							className={`relative flex w-full items-center justify-center overflow-hidden rounded-lg border border-gray-300 p-2 text-center text-sm ${
								selected === name ? 'ring ring-design-main ring-wp' : ''
							}`}
							onClick={() => {
								setSelected(name);
								setPreviewCss(buildPreviewCss(colors));
							}}
						>
							<div className="flex max-w-fit items-center justify-center -space-x-4 rounded-lg rtl:space-x-reverse">
								{colorsArray
									.filter(({ slug }) => slug !== 'background')
									.map(({ slug, color }) => (
										<div
											key={slug}
											style={{ backgroundColor: color }}
											className="size-6 shrink-0 overflow-visible rounded-full border border-white md:size-7"
										/>
									))}
							</div>
						</button>
					))}
				</div>
			</div>
			<div className="flex justify-start gap-2 p-3">
				<button
					type="button"
					className="w-full rounded-sm border border-gray-500 bg-white p-2 text-sm text-gray-900"
					onClick={onCancel}
				>
					{__('Cancel', 'extendify-local')}
				</button>
				<button
					type="button"
					className="w-full rounded-sm border border-gray-500 bg-white p-2 text-sm text-gray-900"
					onClick={handleRetry}
				>
					{__('Try Again', 'extendify-local')}
				</button>
				<button
					type="button"
					className="w-full rounded-sm border border-design-main bg-design-main p-2 text-sm text-white"
					disabled={!selectedPalette}
					onClick={handleConfirm}
				>
					{__('Save', 'extendify-local')}
				</button>
			</div>
		</div>
	);
};
