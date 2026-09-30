import { useSiteVibesOverride } from '@agent/hooks/useSiteVibesOverride';
import { useSiteVibesVariations } from '@agent/hooks/useSiteVibesVariations';
import { useChatStore } from '@agent/state/chat';
import {
	Fragment,
	useEffect,
	useMemo,
	useRef,
	useState,
} from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';

export const SelectSiteVibes = ({ onConfirm, onCancel }) => {
	const { data, isLoading } = useSiteVibesVariations();
	const { vibes, css: styles } = data || {};
	const [selected, setSelected] = useState(null);
	const css = selected ? styles[selected] : '';
	const { undoChange } = useSiteVibesOverride({ css, slug: selected });
	const noVibes = !vibes || vibes.length === 0;

	const confirmed = useRef(false);
	useEffect(() => {
		return () => {
			if (!confirmed.current) undoChange();
		};
	}, []);
	const shuffled = useMemo(
		() => (vibes ? [...vibes].sort(() => Math.random() - 0.5) : []),
		[vibes],
	);
	const { addMessage, messages } = useChatStore();

	const handleConfirm = () => {
		if (!selected) return;
		confirmed.current = true;
		onConfirm({ data: { selectedVibe: selected }, shouldRefreshPage: true });
	};

	useEffect(() => {
		if (isLoading || !noVibes) return;
		const timer = setTimeout(() => onCancel(), 100);
		// translators: "site style" refers to the structural aesthetic style for the site.
		const content = __(
			'We were unable to find any website style for your theme.',
			'extendify-local',
		);
		const last = messages.at(-1)?.details?.content;
		if (content === last) return () => clearTimeout(timer);
		addMessage('message', { role: 'assistant', content, error: true });

		return () => clearTimeout(timer);
	}, [addMessage, onCancel, noVibes, messages, isLoading]);

	if (isLoading) {
		return (
			<div className="min-h-24 p-2 text-center text-sm">
				{
					// translators: "site style" refers to the structural aesthetic style for the site.
					__('Loading website style options...', 'extendify-local')
				}
			</div>
		);
	}

	if (noVibes) return null;

	return (
		<div className="mb-4 ms-2 me-2 flex flex-col rounded-lg border border-gray-300 bg-gray-50">
			<div className="rounded-lg border-b border-gray-400 bg-white">
				<div className="grid gap-3 p-4 grid-cols-2">
					{shuffled?.slice(0, 12).map(({ slug }, index) => (
						<Fragment key={slug}>
							<style>
								{styles[slug]
									?.replaceAll(':root', '.ext-vibe-container')
									?.replaceAll(
										'is-style-ext-preset--',
										'preview-is-style-ext-preset--',
									)}
							</style>
							<button
								aria-label={sprintf(
									__('Style %s', 'extendify-local'),
									index + 1,
								)}
								aria-pressed={selected === slug}
								type="button"
								className={`ext-vibe-container aspect-square relative flex w-full appearance-none items-stretch justify-center overflow-hidden rounded-sm border border-gray-300 bg-none p-0 text-sm shadow-lg focus:outline-none focus:ring-2 focus:ring-design-main focus:ring-offset-1 ${
									selected === slug ? 'ring-2 ring-design-main' : ''
								}`}
								onClick={() => setSelected(slug)}
							>
								<div
									className={`wp-block-group w-full h-full preview-is-style-ext-preset--group--${slug}--section has-background-background-color has-background p-4`}
								>
									<div
										className={`wp-block-group has-tertiary-background-color has-background w-full h-full flex items-center justify-center bg-design-tertiary rtl:space-x-reverse preview-is-style-ext-preset--group--${slug}--item-card-1--align-center p-0`}
									>
										<img
											src="https://images.extendify-cdn.com/agents/style-selector-preview.jpg"
											alt={sprintf(
												__('Style %s', 'extendify-local'),
												index + 1,
											)}
											draggable="false"
											loading="lazy"
											width={96}
											height={96}
											className="w-full h-full object-cover pointer-events-none"
										/>
									</div>
								</div>
							</button>
						</Fragment>
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
