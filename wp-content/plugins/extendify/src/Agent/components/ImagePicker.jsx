import {
	useImageAcquisition,
	useUnsplashSearch,
} from '@agent/hooks/useImageAcquisition';
import { preloadImage } from '@agent/lib/replace-image';
import { useStampedPreview } from '@shared/hooks/useStampedPreview';
import {
	addCustomMediaViewsCss,
	removeCustomMediaViewsCss,
} from '@shared/lib/media-views';
import { Spinner } from '@wordpress/components';
import { useCallback, useEffect, useRef, useState } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import { close, Icon, pencil } from '@wordpress/icons';
import { MediaUpload } from '@wordpress/media-utils';
import classNames from 'classnames';

const TABS = { generate: 'generate', media: 'media', stock: 'unsplash' };

export const ImagePicker = ({
	prompt = '',
	search = '',
	tab,
	autoGenerate = false,
	target,
	onSelect,
	onSubmit,
	onError,
	footer,
}) => {
	const initialSource = TABS[tab] ?? 'generate';
	const [source, setSource] = useState(initialSource);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState(null);
	const [disclose, setDisclose] = useState(false);
	const [editingPrompt, setEditingPrompt] = useState(false);
	const [draftPrompt, setDraftPrompt] = useState('');
	const [editedPrompt, setEditedPrompt] = useState(null);
	const generateButton = useRef(null);
	const onSelectRef = useRef(onSelect);
	onSelectRef.current = onSelect;
	const previewed = useRef(null);

	const applyPreview = useCallback(async (url) => {
		previewed.current = url;
		if (url) await preloadImage(url);
		await onSelectRef.current?.(url);
	}, []);

	const {
		states,
		imageCredits,
		generate,
		attachImage,
		pickUnsplash,
		markAwaiting,
		resolveImage,
	} = useImageAcquisition({
		source: 'agent',
		onUrlReady: (_key, url) => applyPreview(url),
	});
	const state = states[source];
	const ready = state?.status === 'ready';
	const activeUrl = state?.image?.url ?? state?.url ?? null;
	const previewUrl = useStampedPreview(
		activeUrl,
		disclose && source === 'generate',
	);

	// wp.media rebuilds its frame on open, leaving any still-open modal behind empty.
	const openedModal = useRef(null);

	const closeMediaModal = useCallback(() => {
		const remembered = openedModal.current;
		openedModal.current = null;
		// A rebuilt frame takes the class with it, so this lookup misses the shell.
		const mounted = document
			.querySelector('.image__media-modal')
			?.closest('.media-modal');
		for (const modal of new Set([remembered, mounted].filter(Boolean))) {
			modal.querySelector('.media-modal-close')?.click();
		}
	}, []);

	const openMediaModal = useCallback(
		(open) => {
			closeMediaModal();
			open();
			openedModal.current =
				document
					.querySelector('.image__media-modal')
					?.closest('.media-modal') ?? null;
		},
		[closeMediaModal],
	);

	// The picker modal mounts under the Agent without these.
	useEffect(() => {
		addCustomMediaViewsCss();
		const style = document.createElement('style');
		style.textContent = '.media-modal { z-index: 999999 !important; }';
		document.head.appendChild(style);
		return () => {
			closeMediaModal();
			removeCustomMediaViewsCss();
			style.remove();
		};
	}, [closeMediaModal]);

	// The first title segment reads as the page name ("Hoodie – Iron Forge Gym").
	const pageName = document.title.split(/[|–—]/)[0].trim();
	const stockSeed = search || pageName;
	const generatePrompt = editedPrompt ?? (prompt || pageName);

	// Re-renders must not re-kick generation and burn extra credits.
	const started = useRef(false);
	useEffect(() => {
		// The image endpoint 400s on an empty prompt; only an asked-for one counts.
		if (started.current || !autoGenerate || !prompt) return;
		started.current = true;
		generate(initialSource, prompt, target?.());
	}, [autoGenerate, generate, initialSource, prompt, target]);

	useEffect(() => {
		if (previewed.current === previewUrl) return;
		applyPreview(previewUrl);
	}, [previewUrl, applyPreview]);

	const switchSource = (next) => {
		// Left open, the media modal covers the tab just switched to.
		closeMediaModal();
		setSource(next);
	};

	const submit = async () => {
		if (busy) return;
		setBusy(true);
		setError(null);
		try {
			await onSubmit(await resolveImage(source, { disclose }));
		} catch (failure) {
			setBusy(false);
			// Handing it back lets the caller's own flow react — the agent sends
			// it to the model rather than parking the user on a dead picker.
			if (onError) return onError(failure);
			setError(
				failure?.message || __('Failed to save image', 'extendify-local'),
			);
		}
	};

	return (
		<div className="mb-4 ms-2 me-2 flex flex-col overflow-hidden rounded-lg border border-gray-300 bg-gray-50">
			<div
				className="flex border-0 border-b border-solid border-gray-300 bg-gray-100"
				role="tablist"
			>
				<SourceTab
					active={source === 'generate'}
					onClick={() => switchSource('generate')}
					label={__('Generate', 'extendify-local')}
				/>
				<SourceTab
					active={source === 'media'}
					onClick={() => switchSource('media')}
					label={__('Media Library', 'extendify-local')}
				/>
				<SourceTab
					active={source === 'unsplash'}
					onClick={() => switchSource('unsplash')}
					label={__('Stock Photos', 'extendify-local')}
				/>
			</div>
			<div className="border-b border-gray-300 bg-white">
				<div className="flex flex-col gap-2 p-3">
					{source === 'generate' && (
						<>
							{editingPrompt ? (
								<textarea
									// biome-ignore lint/a11y/noAutofocus: the pencil opened it to type in
									autoFocus
									className="m-0 h-48 w-full resize-none overflow-y-auto rounded-sm border border-gray-300 p-2 text-sm"
									aria-label={__('Image description', 'extendify-local')}
									value={draftPrompt}
									onChange={(event) => setDraftPrompt(event.target.value)}
								/>
							) : (
								<ImageSlot
									url={ready ? previewUrl : null}
									generating={state?.status === 'generating'}
									label={__('Generate an image', 'extendify-local')}
									whole
								/>
							)}
							{state?.status === 'error' && !editingPrompt && (
								<p className="m-0 p-0 text-sm text-red-700">{state.message}</p>
							)}
							{!editingPrompt && (
								<label className="flex cursor-pointer items-center gap-2 text-sm text-gray-900">
									<input
										type="checkbox"
										className="m-0"
										checked={disclose}
										onChange={(event) => setDisclose(event.target.checked)}
									/>
									<span>
										{
											// translators: Checkbox that adds a visible "AI Generated" mark onto the image.
											__('Label image as AI-generated', 'extendify-local')
										}
									</span>
								</label>
							)}
							{editingPrompt ? (
								<button
									type="button"
									className="w-full rounded-sm border border-design-main bg-design-main p-2 text-sm text-white"
									onClick={() => {
										setEditedPrompt(draftPrompt.trim() || null);
										setEditingPrompt(false);
										// Focus back on Generate: saving must not spend a credit.
										requestAnimationFrame(() =>
											generateButton.current?.focus(),
										);
									}}
								>
									{__('Save', 'extendify-local')}
								</button>
							) : (
								<div className="flex gap-2">
									<button
										type="button"
										ref={generateButton}
										className="flex-1 rounded-sm border border-design-main bg-design-main p-2 text-sm text-white disabled:opacity-50"
										disabled={busy || state?.status === 'generating'}
										onClick={() =>
											generate('generate', generatePrompt, target?.())
										}
									>
										{ready || state?.status === 'error'
											? __('Try Again', 'extendify-local')
											: __('Generate Image', 'extendify-local')}
									</button>
									<button
										type="button"
										aria-label={__('Edit image description', 'extendify-local')}
										className="flex cursor-pointer items-center justify-center rounded-sm border border-gray-500 bg-white px-2 text-gray-900 disabled:cursor-default disabled:opacity-50"
										disabled={busy || state?.status === 'generating'}
										onClick={() => {
											setDraftPrompt(generatePrompt);
											setEditingPrompt(true);
										}}
									>
										<Icon fill="currentColor" icon={pencil} size={20} />
									</button>
								</div>
							)}
							<div className="text-pretty text-center text-xss leading-none text-gray-700">
								{sprintf(
									// translators: %1$s is the number of credits remaining, %2$s is the total credits
									__(
										'You have %1$s of %2$s daily image credits remaining.',
										'extendify-local',
									),
									imageCredits.remaining,
									imageCredits.total,
								)}
							</div>
						</>
					)}
					{source === 'media' && (
						<MediaUpload
							title={__('Select or Upload Image', 'extendify-local')}
							onSelect={async (attachment) => {
								if (!attachment?.url) return;
								await applyPreview(attachment.url);
								attachImage('media', {
									id: attachment.id,
									url: attachment.url,
								});
							}}
							allowedTypes={['image']}
							modalClass="image__media-modal"
							render={({ open }) => {
								const openLibrary = () => openMediaModal(open);
								return (
									<>
										<ImageSlot
											url={ready ? activeUrl : null}
											label={__('Set image', 'extendify-local')}
											onClick={busy ? undefined : openLibrary}
											openLabel={
												ready && activeUrl
													? __('Change image', 'extendify-local')
													: __('Choose an image', 'extendify-local')
											}
										/>
										<button
											type="button"
											className="w-full rounded-sm border border-design-main bg-design-main p-2 text-sm text-white disabled:opacity-50"
											disabled={busy}
											onClick={openLibrary}
										>
											{__('Open Media Library', 'extendify-local')}
										</button>
									</>
								);
							}}
						/>
					)}
					{source === 'unsplash' && (
						<UnsplashTab
							selectedUrl={ready ? activeUrl : null}
							disabled={busy}
							initialSearch={stockSeed}
							onPick={(photo) => pickUnsplash('unsplash', photo)}
							onClear={() => markAwaiting('unsplash')}
						/>
					)}
					{error && <p className="m-0 p-0 text-sm text-red-700">{error}</p>}
				</div>
			</div>
			{footer({ ready, busy, submit })}
		</div>
	);
};

export const PickerActions = ({ children }) => (
	<div className="flex gap-2 p-3">{children}</div>
);

export const PickerButton = ({ primary, disabled, onClick, children }) => (
	<button
		type="button"
		className={classNames(
			'flex-1 rounded-sm p-2 text-sm disabled:opacity-50',
			primary
				? 'border border-design-main bg-design-main text-white'
				: 'border border-gray-500 bg-white text-gray-900',
		)}
		disabled={disabled}
		onClick={onClick}
	>
		{children}
	</button>
);

const SourceTab = ({ active, onClick, label }) => (
	<button
		type="button"
		role="tab"
		aria-selected={active}
		className={classNames(
			// Bordered in both states so switching tabs can't reflow the label.
			'flex-1 cursor-pointer border-x border-solid border-transparent px-1.5 py-2 text-xs text-gray-900 transition-colors',
			active
				? '-mb-px border-gray-300 bg-white font-medium first:border-s-transparent last:border-e-transparent'
				: 'bg-transparent',
		)}
		onClick={onClick}
	>
		{label}
	</button>
);

const ImageSlot = ({ url, generating, label, onClick, openLabel, whole }) => {
	if (onClick) {
		return (
			<button
				type="button"
				aria-label={openLabel}
				className="block w-full cursor-pointer border-0 bg-transparent p-0"
				onClick={onClick}
			>
				<ImageSlot url={url} generating={generating} label={label} />
			</button>
		);
	}
	if (generating) {
		return (
			<div className="relative h-48 w-full">
				<output
					aria-label={__('Generating image...', 'extendify-local')}
					className="absolute inset-0 block animate-pulse rounded-sm bg-gradient-to-br from-gray-100 to-gray-300"
				/>
				<Spinner className="absolute inset-0 m-auto h-6 w-6" />
			</div>
		);
	}
	if (url) {
		return (
			<img
				className={classNames(
					'm-0 h-48 w-full rounded-sm border border-gray-300',
					// Cover crops the corner the disclosure pill sits in.
					whole ? 'bg-gray-100 object-contain' : 'object-cover',
				)}
				src={url}
				alt={__('Selected image preview', 'extendify-local')}
			/>
		);
	}
	return (
		<div
			data-testid="image-placeholder"
			className="flex h-48 w-full items-center justify-center rounded-sm bg-gradient-to-br from-gray-100 to-gray-300"
		>
			{label && <p className="m-0 p-0 text-sm text-gray-700">{label}</p>}
		</div>
	);
};

const UnsplashTab = ({
	selectedUrl,
	disabled,
	initialSearch,
	onPick,
	onClear,
}) => {
	const [search, setSearch] = useState(initialSearch);
	const [searchDebounced, setSearchDebounced] = useState(initialSearch);
	const { data: images, loading } = useUnsplashSearch(searchDebounced, 'user');

	useEffect(() => {
		if (!search) return setSearchDebounced('');
		const id = setTimeout(() => setSearchDebounced(search), 750);
		return () => clearTimeout(id);
	}, [search]);

	return (
		<>
			{selectedUrl ? (
				<div className="relative h-48 w-full">
					<img
						className="m-0 h-full w-full rounded-sm border border-gray-300 object-cover"
						src={selectedUrl}
						alt={__('Selected image preview', 'extendify-local')}
					/>
					<button
						type="button"
						aria-label={__('Clear selected image', 'extendify-local')}
						className="absolute end-1 top-1 flex h-6 w-6 cursor-pointer items-center justify-center rounded-sm border-0 bg-white/90 p-0 text-gray-900 hover:bg-white"
						disabled={disabled}
						onClick={onClear}
					>
						<Icon fill="currentColor" icon={close} size={18} />
					</button>
				</div>
			) : loading ? (
				<output
					aria-label={__('Loading photos...', 'extendify-local')}
					className="grid h-48 w-full animate-pulse grid-cols-3 gap-1"
				>
					{Array.from({ length: 6 }, (_, index) => (
						<div key={index} className="rounded-sm bg-gray-200" />
					))}
				</output>
			) : images?.length ? (
				<div className="grid h-48 auto-rows-min content-start grid-cols-3 gap-1 overflow-y-auto">
					{images.map((photo) => (
						<button
							key={photo.id}
							type="button"
							className="m-0 border-0 bg-transparent p-0"
							disabled={disabled}
							aria-label={
								photo.alt_description || __('Stock photo', 'extendify-local')
							}
							onClick={() => onPick(photo)}
						>
							<img
								className="m-0 aspect-square w-full rounded-sm object-cover"
								src={photo.urls?.small}
								alt={photo.alt_description ?? ''}
							/>
						</button>
					))}
				</div>
			) : (
				<div className="flex h-48 w-full items-center justify-center rounded-sm bg-gradient-to-br from-gray-100 to-gray-300 px-4">
					<p className="m-0 p-0 text-center text-sm text-gray-700">
						{__('No images found.', 'extendify-local')}
					</p>
				</div>
			)}
			<input
				type="search"
				className="w-full rounded-sm border border-gray-300 p-2 text-sm"
				placeholder={__('Search photos...', 'extendify-local')}
				aria-label={__('Search photos', 'extendify-local')}
				value={search}
				onChange={(event) => {
					setSearch(event.target.value);
					if (selectedUrl) onClear();
				}}
			/>
		</>
	);
};
