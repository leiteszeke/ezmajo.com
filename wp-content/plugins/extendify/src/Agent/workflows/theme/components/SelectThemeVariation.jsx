import { usePaletteOverride } from '@agent/hooks/usePaletteOverride';
import { usePalettes } from '@agent/hooks/usePalettes';
import { useThemeVariations } from '@agent/hooks/useThemeVariations';
import { useVariationOverride } from '@agent/hooks/useVariationOverride';
import { useChatStore } from '@agent/state/chat';
import { paletteDuotone } from '@shared/lib/palette-preview';
import { samplePalettes } from '@shared/lib/palettes';
import { useEffect, useMemo, useRef, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

const VISIBLE_LIMIT = 8;

export const SelectThemeVariation = ({ onConfirm, onCancel }) => {
	const [css, setCss] = useState('');
	const [selected, setSelected] = useState(null);
	const [duotoneTheme, setDuotoneTheme] = useState(null);
	const {
		palettes,
		css: paletteCss,
		preferred,
		isLoading: palettesLoading,
	} = usePalettes();
	const onPalettes = Boolean(palettes?.length);
	const { variations, isLoading: variationsLoading } = useThemeVariations({
		enabled: !palettesLoading && !onPalettes,
	});
	const isLoading = palettesLoading || variationsLoading;

	// A palette layers over core's global styles; a variation replaces them.
	const { undoChange: undoPalette } = usePaletteOverride({
		css: onPalettes ? css : '',
		duotoneTheme: onPalettes ? duotoneTheme : null,
	});
	const { undoChange: undoVariation } = useVariationOverride({
		css: onPalettes ? '' : css,
		duotoneTheme: onPalettes ? null : duotoneTheme,
	});
	const undoChange = onPalettes ? undoPalette : undoVariation;

	const confirmed = useRef(false);
	const undo = useRef(undoChange);
	useEffect(() => {
		undo.current = undoChange;
	}, [undoChange]);
	useEffect(() => {
		return () => {
			if (!confirmed.current) undo.current();
		};
	}, []);
	const { addMessage, messages } = useChatStore();

	// Drawn per mount, so the immutable SWR cache cannot freeze one set.
	const shown = useMemo(
		() => samplePalettes(palettes, preferred, VISIBLE_LIMIT),
		[palettes, preferred],
	);

	const options = useMemo(
		() =>
			onPalettes ? paletteOptions(shown, paletteCss) : themeOptions(variations),
		[onPalettes, shown, paletteCss, variations],
	);
	const noOptions = options.length === 0;

	const handleConfirm = () => {
		if (!selected) return;
		const option = options.find(({ key }) => key === selected);
		if (!option) {
			// translators: A chat message shown to the user when their selected color variation cannot be applied
			const content = __(
				'We were unable to apply your selected colors. Please try again.',
				'extendify-local',
			);
			addMessage('message', { role: 'assistant', content, error: true });
			onCancel();
			return;
		}
		confirmed.current = true;
		onConfirm({ data: option.data, shouldRefreshPage: true });
	};

	useEffect(() => {
		if (isLoading || !noOptions) return;
		const timer = setTimeout(() => onCancel(), 100);
		// translators: A chat message shown to the user
		const content = __(
			'We were unable to find any colors for your theme',
			'extendify-local',
		);
		const last = messages.at(-1)?.details?.content;
		if (content === last) return () => clearTimeout(timer);
		addMessage('message', { role: 'assistant', content, error: true });
		return () => clearTimeout(timer);
	}, [addMessage, onCancel, noOptions, messages, isLoading]);

	if (isLoading) {
		return (
			<div className="min-h-24 p-2 text-center text-sm">
				{__('Loading available colors...', 'extendify-local')}
			</div>
		);
	}

	if (noOptions) return null;

	return (
		<div className="mb-4 ms-2 me-2 flex flex-col rounded-lg border border-gray-300 bg-gray-50">
			<div className="rounded-lg border-b border-gray-300 bg-white">
				<div className="grid grid-cols-2 gap-2 p-3">
					{options.map(
						({ key, title, background, swatches, previewCss, duotone }) => (
							<button
								key={key}
								style={{ backgroundColor: background }}
								type="button"
								aria-label={title}
								className={`relative flex w-full items-center justify-center overflow-hidden rounded-lg border border-gray-300 bg-none p-2 text-center text-sm ${
									selected === key ? 'ring ring-design-main ring-wp' : ''
								}`}
								onClick={() => {
									setSelected(key);
									setCss(previewCss);
									setDuotoneTheme(duotone);
								}}
							>
								<div className="flex max-w-fit items-center justify-center -space-x-4 rounded-lg rtl:space-x-reverse">
									{swatches.map((color, i) => (
										<div
											key={key + color + i}
											style={{ backgroundColor: color }}
											className="size-6 shrink-0 overflow-visible rounded-full border border-white md:size-7"
										></div>
									))}
								</div>
							</button>
						),
					)}
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
					className="w-full rounded-sm border border-design-main bg-design-main p-2 text-sm text-white"
					disabled={!selected}
					onClick={handleConfirm}
				>
					{__('Save', 'extendify-local')}
				</button>
			</div>
		</div>
	);
};

// `colors` also carries tint1-3 card backgrounds, never swatches.
const SWATCH_ROLES = [
	'foreground',
	'primary',
	'secondary',
	'tertiary',
	'foregroundAlt',
];

// Only `colors` is guaranteed hex; settings.color.palette carries var() refs.
const paletteOptions = (palettes, css) =>
	palettes.map((palette) => ({
		key: palette.slug,
		title: palette.title || palette.slug,
		background: palette.colors?.background,
		swatches: SWATCH_ROLES.map((role) => palette.colors?.[role]).filter(
			Boolean,
		),
		previewCss: css?.[palette.slug] ?? '',
		duotone: paletteDuotone(palette),
		data: { colorPalette: palette.slug },
	}));

const themeOptions = (variations) =>
	[...(variations ?? [])]
		.sort(() => Math.random() - 0.5)
		.slice(0, VISIBLE_LIMIT)
		.map((variation) => ({
			key: variation.title,
			title: variation.title,
			background: themeColor(variation.settings, 'background'),
			swatches: themeSwatches(variation.settings),
			previewCss: variation.css,
			duotone: variation.settings?.color?.duotone?.theme,
			data: { variation },
		}));

const themeColor = (settings, colorName) =>
	settings?.color?.palette?.theme?.find((item) => item.slug === colorName)
		?.color;

const themeSwatches = (settings) =>
	settings?.color?.palette?.theme
		?.filter((item) => item.slug !== 'background')
		?.map((item) => item.color) ?? [];
