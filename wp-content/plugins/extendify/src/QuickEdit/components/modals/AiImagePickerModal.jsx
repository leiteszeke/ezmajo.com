import { generateImage } from '@shared/api/DataApi';
import { downloadImage } from '@shared/api/wp';
import { useStampedPreview } from '@shared/hooks/useStampedPreview';
import { track } from '@shared/lib/track';
import { useImageGenerationStore } from '@shared/state/generate-images';
import {
	Button,
	CheckboxControl,
	Modal,
	Notice,
	Spinner,
	TextareaControl,
	__experimentalToggleGroupControl as ToggleGroupControl,
	__experimentalToggleGroupControlOption as ToggleGroupControlOption,
} from '@wordpress/components';
import { useRef, useState } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import { loadProduct, save, saveProduct } from '../../lib/api';
import { invalidateBlockSource } from '../../lib/block-source-cache';
import { useCmdEnterSave } from '../../lib/cmd-enter-save';
import { splice } from '../../lib/dom';
import { friendlyMessage } from '../../lib/errors';
import { QE_MODAL_BODY_OPEN_CLASS } from '../../lib/modal-root';
import { pushUndo } from '../../state/undo';
import { ModalCloseButton } from './ModalCloseButton';

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

export const AiImagePickerModal = ({ selected, field, onAfterSave }) => {
	const {
		imageCredits,
		updateImageCredits,
		subtractOneCredit,
		aiImageOptions,
		setAiImageOption,
	} = useImageGenerationStore();
	const [disclose, setDisclose] = useState(false);
	const [generating, setGenerating] = useState(false);
	const [applying, setApplying] = useState(false);
	const [error, setError] = useState('');
	const [preview, setPreview] = useState(null); // { src, id }
	const abortRef = useRef(null);
	const previewSrc = useStampedPreview(preview?.src, disclose);

	const noCredits = imageCredits.remaining === 0;
	const usedCredits = imageCredits.total - imageCredits.remaining;

	const onGenerate = async (e) => {
		e?.preventDefault?.();
		setError('');
		if (noCredits || !aiImageOptions.prompt) return;
		try {
			setGenerating(true);
			subtractOneCredit();
			abortRef.current = new AbortController();
			const {
				imageCredits: newCredits,
				images,
				id: gid,
			} = await generateImage(aiImageOptions, abortRef.current.signal);
			updateImageCredits(newCredits);
			setPreview({
				src: images[0].url,
				id: gid,
				alt: images[0].alt ?? aiImageOptions.prompt,
			});
			track('ai_image_generated', { size: aiImageOptions.size });
		} catch (err) {
			if (err?.code === 20) return; // aborted
			if (!err?.imageCredits) {
				setError(
					err?.message || __('Image generation failed', 'extendify-local'),
				);
				updateImageCredits({ remaining: imageCredits.remaining });
				track('ai_image_failed');
				return;
			}
			updateImageCredits(err.imageCredits);
			setError(err.message);
			track('ai_image_failed', { reason: 'no_credits' });
		} finally {
			setGenerating(false);
		}
	};

	const onUse = async () => {
		if (!preview?.src || applying) return;
		setError('');
		setApplying(true);
		try {
			const attachment = await downloadImage(
				preview.id,
				preview.src,
				'ai-generated',
				null,
				{
					alt: preview.alt,
					filename: 'ai-image.jpg',
					caption: '',
					disclose,
				},
			);
			const mediaId = attachment?.id;
			if (!mediaId) throw new Error('No media id returned');

			// Product image: write the featured image via WC's save
			// endpoint and reload (the same image cascades to many
			// surfaces — splice can't reach all of them).
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
				track('image_replaced', { source: 'ai', kind: 'product' });
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
							url: attachment.url || attachment.source_url,
							id: mediaId,
							alt: attachment.alt_text ?? '',
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
			track('image_replaced', { source: 'ai' });
			onAfterSave(true);
		} catch (err) {
			track('save_failed', { kind: 'image', source: 'ai' });
			setError(friendlyMessage(err));
			setApplying(false);
		}
	};

	const onClear = () => {
		setPreview(null);
		setError('');
	};

	const onClose = () => {
		abortRef.current?.abort();
		onAfterSave(false);
	};

	useCmdEnterSave(
		onGenerate,
		!preview?.src && !generating && !!aiImageOptions.prompt && !noCredits,
	);

	return (
		<Modal
			title={__('Generate image with AI', 'extendify-local')}
			onRequestClose={onClose}
			isDismissible={false}
			headerActions={<ModalCloseButton onClick={onClose} />}
			className="extendify-quick-edit-modal extendify-quick-edit-ai-image"
			overlayClassName="extendify-quick-edit"
			bodyOpenClassName={QE_MODAL_BODY_OPEN_CLASS}
			size="medium"
		>
			{error ? (
				<Notice status="error" isDismissible={false}>
					{error}
				</Notice>
			) : null}
			{preview?.src ? (
				<div className="extendify-quick-edit-ai-preview">
					<img src={previewSrc} alt={preview.alt} />
				</div>
			) : (
				<form onSubmit={onGenerate} className="extendify-quick-edit-ai-form">
					<TextareaControl
						autoFocus
						label={__('Image description', 'extendify-local')}
						placeholder={__(
							'Describe the image you want to create',
							'extendify-local',
						)}
						value={aiImageOptions.prompt}
						onChange={(v) => setAiImageOption('prompt', v)}
						rows={4}
						disabled={generating}
						__nextHasNoMarginBottom
					/>
					<ToggleGroupControl
						isBlock
						label={__('Aspect ratio', 'extendify-local')}
						value={aiImageOptions.size}
						onChange={(v) => setAiImageOption('size', v)}
						__nextHasNoMarginBottom
					>
						<ToggleGroupControlOption
							value="1024x1024"
							label={
								// translators: image aspect ratio — a square (1:1) shape.
								__('Square', 'extendify-local')
							}
						/>
						<ToggleGroupControlOption
							value="1536x1024"
							label={
								// translators: image aspect ratio — landscape orientation (wider than tall).
								__('Landscape', 'extendify-local')
							}
						/>
						<ToggleGroupControlOption
							value="1024x1536"
							label={
								// translators: image aspect ratio — portrait orientation (taller than wide).
								__('Portrait', 'extendify-local')
							}
						/>
					</ToggleGroupControl>
					<CheckboxControl
						__nextHasNoMarginBottom
						// translators: Checkbox that adds a visible "AI Generated" mark onto the image.
						label={__('Label image as AI-generated', 'extendify-local')}
						checked={disclose}
						onChange={setDisclose}
						disabled={generating}
					/>
					{generating ? (
						// biome-ignore lint/a11y/useSemanticElements: deliberate live region; <output> changes display + semantics
						<div className="extendify-quick-edit-ai-generating" role="status">
							<Spinner />
							<span>{__('Generating image…', 'extendify-local')}</span>
						</div>
					) : null}
					<div className="extendify-quick-edit-ai-credits" aria-live="polite">
						{sprintf(
							// translators: %1$d is the number of credits used, %2$d is the total credits available.
							__('%1$d of %2$d credits used', 'extendify-local'),
							usedCredits,
							imageCredits.total,
						)}
					</div>
				</form>
			)}
			<div className="extendify-quick-edit-modal-actions">
				{preview?.src ? (
					<>
						<Button variant="tertiary" onClick={onClear} disabled={applying}>
							{__('Try again', 'extendify-local')}
						</Button>
						<Button
							variant="primary"
							onClick={onUse}
							isBusy={applying}
							disabled={applying}
						>
							{__('Use image', 'extendify-local')}
						</Button>
					</>
				) : (
					<>
						<Button variant="tertiary" onClick={onClose}>
							{__('Cancel', 'extendify-local')}
						</Button>
						<Button
							variant="primary"
							onClick={onGenerate}
							isBusy={generating}
							disabled={generating || !aiImageOptions.prompt || noCredits}
						>
							{noCredits
								? __('Out of credits', 'extendify-local')
								: __('Generate', 'extendify-local')}
						</Button>
					</>
				)}
			</div>
		</Modal>
	);
};
