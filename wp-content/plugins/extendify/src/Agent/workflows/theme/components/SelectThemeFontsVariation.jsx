import { useFontVariationOverride } from '@agent/hooks/useFontVariationOverride';
import { useThemeFontsVariations } from '@agent/hooks/useThemeFontsVariations';
import { useChatStore } from '@agent/state/chat';
import { useEffect, useMemo, useRef, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

export const SelectThemeFontsVariation = ({ onConfirm, onCancel }) => {
	const [css, setCss] = useState('');
	const [selected, setSelected] = useState(null);
	const { undoChange } = useFontVariationOverride({ css });
	const { variations, isLoading } = useThemeFontsVariations();

	const confirmed = useRef(false);
	useEffect(() => {
		return () => {
			if (!confirmed.current) undoChange();
		};
	}, []);

	const noVariations = !variations || variations.length === 0;
	const shuffled = useMemo(
		() => (variations ? variations.sort(() => Math.random() - 0.5) : []),
		[variations],
	);
	const { addMessage, messages } = useChatStore();

	const handleConfirm = () => {
		if (!selected) return;
		confirmed.current = true;
		onConfirm({
			data: { variation: variations.find((v) => v.title === selected) },
			shouldRefreshPage: true,
		});
	};

	useEffect(() => {
		if (isLoading || !noVariations) return;
		const timer = setTimeout(() => onCancel(), 100);
		// translators: A chat message shown to the user
		const content = __(
			'We were unable to find any variations for your theme',
			'extendify-local',
		);
		const last = messages.at(-1)?.details?.content;
		if (content === last) return () => clearTimeout(timer);
		addMessage('message', { role: 'assistant', content, error: true });
		return () => clearTimeout(timer);
	}, [addMessage, onCancel, noVariations, messages, isLoading]);

	if (isLoading) {
		return (
			<div className="min-h-24 p-2 text-center text-sm">
				{__('Loading font variations...', 'extendify-local')}
			</div>
		);
	}

	if (noVariations) return null;

	return (
		<div className="mb-4 ms-2 me-2 flex flex-col rounded-lg border border-gray-300 bg-gray-50">
			<div className="rounded-lg border-b border-gray-300 bg-white">
				<div className="grid grid-cols-2 gap-2 p-3">
					{shuffled?.slice(0, 10)?.map(({ title, css, styles }) => (
						<button
							key={title}
							aria-label={title}
							type="button"
							style={{ fontFamily: getFont(styles)?.normal }}
							className={`relative flex w-full items-center justify-center overflow-hidden rounded-lg border border-gray-300 bg-none p-2 text-center text-sm ${
								selected === title ? 'ring ring-design-main ring-wp' : ''
							}`}
							onClick={() => {
								setSelected(title);
								setCss(css);
							}}
						>
							<div className="max-w-fit content-stretch items-center justify-center rounded-lg text-2xl rtl:space-x-reverse">
								<span style={{ fontFamily: getFont(styles)?.heading }}>A</span>
								<span style={{ fontFamily: getFont(styles)?.normal }}>a</span>
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

const getFont = (styles) => {
	if (
		styles?.typography?.fontFamily &&
		styles?.elements?.heading?.typography?.fontFamily
	) {
		return {
			normal: styles.typography.fontFamily,
			heading:
				styles.elements.heading.typography.fontFamily ||
				styles.typography.fontFamily,
		};
	}

	if (styles?.typography?.fontFamily) {
		return {
			normal: styles.typography.fontFamily,
			heading: styles.typography.fontFamily,
		};
	}
};
