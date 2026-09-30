import { downloadImage } from '@shared/api/wp';
import { resolveImageSearch } from '@shared/lib/image-search-defaults';
import { track } from '@shared/lib/track';
import { fetchImages } from '@shared/lib/unsplash';
import {
	Button,
	Modal,
	Notice,
	SearchControl,
	Spinner,
} from '@wordpress/components';
import { useEffect, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { loadProduct, save, saveProduct } from '../../lib/api';
import { invalidateBlockSource } from '../../lib/block-source-cache';
import { splice } from '../../lib/dom';
import { friendlyMessage } from '../../lib/errors';
import { QE_MODAL_BODY_OPEN_CLASS } from '../../lib/modal-root';
import { pushUndo } from '../../state/undo';
import { ModalCloseButton } from './ModalCloseButton';

// The modal portals outside `div.extendify-quick-edit`, so the bundle's
// prefix-scoped `.sr-only` doesn't reach it — hide the loading label inline.
const SR_ONLY_STYLE = {
	position: 'absolute',
	width: '1px',
	height: '1px',
	margin: '-1px',
	padding: 0,
	overflow: 'hidden',
	clip: 'rect(0, 0, 0, 0)',
	whiteSpace: 'nowrap',
	border: 0,
};

// Local copy (vs. importing from InlineEditor) so this modal can be code-split later.
const readImageAttrs = (liveEl) => {
	const img =
		liveEl.querySelector('.wp-block-cover__image-background') ||
		liveEl.querySelector('img');
	if (!img) return null;
	const url = img.getAttribute('src') || '';
	const alt = img.getAttribute('alt') || '';
	let id = null;
	for (const cls of img.classList) {
		const m = /^wp-image-(\d+)$/.exec(cls);
		if (m) {
			id = Number(m[1]);
			break;
		}
	}
	return { url, id, alt };
};

export const UnsplashImagePickerModal = ({ selected, field, onAfterSave }) => {
	const [search, setSearch] = useState('');
	const [debounced, setDebounced] = useState('');
	const [images, setImages] = useState(null);
	const [loadError, setLoadError] = useState(null);
	const [pending, setPending] = useState(null);
	const [error, setError] = useState(null);

	useEffect(() => {
		if (!search) {
			setDebounced('');
			return undefined;
		}
		const t = setTimeout(() => {
			setDebounced(search);
			track('unsplash_searched', { len: search.length });
		}, 500);
		return () => clearTimeout(t);
	}, [search]);

	useEffect(() => {
		const ac = new AbortController();
		setLoadError(null);
		setImages(null);
		// Not the shared prefetch cache: it holds a mix of every profile term,
		// where one resolved term keeps the grid on a single subject.
		fetchImages(resolveImageSearch(debounced), 'user')
			.then((res) => {
				if (ac.signal.aborted) return;
				setImages(res || []);
			})
			.catch((err) => {
				if (ac.signal.aborted) return;
				setLoadError(friendlyMessage(err));
			});
		return () => ac.abort();
	}, [debounced]);

	const onPick = async (image) => {
		if (pending) return;
		setError(null);
		setPending(image.id);
		try {
			const downloaded = await downloadImage(
				image.requestMetadata?.id,
				image.urls?.regular,
				'unsplash',
				image.id,
				{
					alt: image.alt_description || image.description || '',
					caption: '',
				},
			);
			const mediaId = downloaded?.id;
			if (!mediaId) throw new Error('No media id returned');

			// Product image: write through `saveProduct` and reload
			// (cascades to product-collection cards / single-product
			// page / related-products carousels — splice can't reach
			// them all). Mirrors the wp.media + AI flows.
			if (selected.source?.kind === 'product') {
				let beforeImageId = 0;
				try {
					const cur = await loadProduct(selected.source.id);
					beforeImageId = Number(cur?.image_id) || 0;
				} catch (_) {
					// non-fatal — undo entry just won't have a before-state
				}
				await saveProduct({
					productId: selected.source.id,
					field: 'image',
					value: mediaId,
				});
				if (beforeImageId && beforeImageId !== mediaId) {
					pushUndo({
						kind: 'product-image',
						productReplay: true,
						productId: selected.source.id,
						field: 'image',
						beforeValue: beforeImageId,
					});
				}
				track('image_replaced', { source: 'unsplash', kind: 'product' });
				onAfterSave(true);
				return;
			}

			const before = readImageAttrs(selected.mediaEl ?? selected.el);
			const res = await save({
				source: selected.source,
				blockId: selected.blockId,
				blockType: selected.blockName ?? selected.blockType,
				patches: [
					{
						fieldKey: field,
						value: {
							url: downloaded.url || downloaded.source_url,
							id: mediaId,
							alt: downloaded.alt_text || image.alt_description || '',
						},
					},
				],
			});
			if (!res.rendered) throw new Error('No rendered HTML');
			const newEl = splice(selected.el, res.rendered);
			if (!newEl) throw new Error('Splice failed');
			invalidateBlockSource(selected.source, selected.blockId);
			if (before) {
				pushUndo({
					kind: 'image',
					source: selected.source,
					blockId: selected.blockId,
					blockType: selected.blockName ?? selected.blockType,
					patches: [{ fieldKey: field, value: before }],
				});
			}
			track('image_replaced', { source: 'unsplash' });
			onAfterSave(true);
		} catch (err) {
			track('save_failed', { kind: 'image', source: 'unsplash' });
			setError(friendlyMessage(err));
			setPending(null);
		}
	};

	return (
		<Modal
			title={__('Search Unsplash', 'extendify-local')}
			onRequestClose={() => onAfterSave(false)}
			isDismissible={false}
			headerActions={<ModalCloseButton onClick={() => onAfterSave(false)} />}
			className="extendify-quick-edit-modal extendify-quick-edit-image-picker"
			overlayClassName="extendify-quick-edit"
			bodyOpenClassName={QE_MODAL_BODY_OPEN_CLASS}
			size="large"
		>
			{error ? (
				<Notice status="error" isDismissible={false}>
					{error}
				</Notice>
			) : null}
			<SearchControl
				value={search}
				onChange={(v) => setSearch(v)}
				placeholder={__(
					'Describe an image to search Unsplash',
					'extendify-local',
				)}
				disabled={!!pending}
				autoFocus
				__nextHasNoMarginBottom
			/>
			<div
				className="extendify-quick-edit-image-grid"
				aria-busy={!images && !loadError}
			>
				{loadError ? (
					<Notice status="error" isDismissible={false}>
						{loadError}
					</Notice>
				) : null}
				{!images && !loadError ? (
					// biome-ignore lint/a11y/useSemanticElements: deliberate live region; <output> changes display + semantics
					<div role="status">
						<Spinner />
						<span style={SR_ONLY_STYLE}>
							{__('Loading images…', 'extendify-local')}
						</span>
					</div>
				) : null}
				{images?.length === 0 ? (
					// biome-ignore lint/a11y/useSemanticElements: deliberate live region; <output> changes display + semantics
					<p role="status">{__('No images found.', 'extendify-local')}</p>
				) : null}
				{images?.map((image) => (
					<button
						key={image.id}
						type="button"
						className="extendify-quick-edit-image-grid-item"
						onClick={() => onPick(image)}
						disabled={!!pending}
						aria-label={
							image.alt_description || __('Use this image', 'extendify-local')
						}
					>
						<img
							src={image.urls?.small || image.urls?.thumb}
							alt={image.alt_description || ''}
							loading="lazy"
						/>
						<UnsplashCredit image={image} />
						{pending === image.id ? (
							<span className="extendify-quick-edit-image-grid-item-overlay">
								<Spinner />
							</span>
						) : null}
					</button>
				))}
			</div>
			{images?.length ? <UnsplashFooter /> : null}
			<div className="extendify-quick-edit-modal-actions">
				<Button variant="tertiary" onClick={() => onAfterSave(false)}>
					{__('Cancel', 'extendify-local')}
				</Button>
			</div>
		</Modal>
	);
};

// Unsplash API guidelines (https://help.unsplash.com/en/articles/2511315):
//  - Per-photo: credit the photographer with a link back to their
//    Unsplash profile.
//  - Hot-link the photographer + Unsplash links with the
//    `utm_source` + `utm_medium=referral` query params so Unsplash
//    can track downstream attribution.
//  - Each link MUST open on Unsplash (target=_blank + rel safe defaults).
const UTM = 'utm_source=extendify&utm_medium=referral';
const withUtm = (url) => {
	if (!url) return url;
	return url.includes('?') ? `${url}&${UTM}` : `${url}?${UTM}`;
};

const UnsplashCredit = ({ image }) => {
	const name = image?.user?.name;
	const profile = image?.user?.links?.html;
	if (!name) return null;
	return (
		<span className="extendify-quick-edit-image-grid-item-credit">
			{
				/* translators: image credit line; precedes the photographer's name. */ __(
					'Photo by',
					'extendify-local',
				)
			}{' '}
			{profile ? (
				<a
					href={withUtm(profile)}
					target="_blank"
					rel="noopener noreferrer"
					onClick={(e) => e.stopPropagation()}
				>
					{name}
				</a>
			) : (
				name
			)}
		</span>
	);
};

const UnsplashFooter = () => (
	<p className="extendify-quick-edit-image-attribution">
		{
			/* translators: precedes the "Unsplash" brand link. */ __(
				'Photos powered by',
				'extendify-local',
			)
		}{' '}
		<a
			href={withUtm('https://unsplash.com/')}
			target="_blank"
			rel="noopener noreferrer"
		>
			Unsplash
		</a>
		.
	</p>
);
