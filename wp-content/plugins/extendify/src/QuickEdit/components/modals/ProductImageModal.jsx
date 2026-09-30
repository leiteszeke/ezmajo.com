import { track } from '@shared/lib/track';
import { useEffect, useRef } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { loadProduct, saveProduct } from '../../lib/api';
import { pushUndo } from '../../state/undo';

export const ProductImageModal = ({ productId, onAfterSave }) => {
	const opened = useRef(false);
	const beforeImageId = useRef(null);

	useEffect(() => {
		if (opened.current) return undefined;
		opened.current = true;
		if (!window.wp?.media) {
			onAfterSave(false);
			return undefined;
		}

		// Prefetch current image id for the undo before-state.
		loadProduct(productId)
			.then((res) => {
				beforeImageId.current = Number(res.image_id) || 0;
			})
			.catch(() => {
				// non-fatal — undo entry just won't have a before
			});

		const frame = window.wp.media({
			title: __('Replace product image', 'extendify-local'),
			button: { text: __('Use image', 'extendify-local') },
			library: { type: 'image' },
			multiple: false,
		});
		frame.on('open', () => {
			// Class lives on QE's own modal element, NOT on body — see
			// InlineEditor.jsx for the same pattern. Putting the class on
			// body would also style the AI Agent's media frames (or any
			// other wp.media frame open at the same time) and blank their
			// content.
			frame.modal?.$el?.addClass('extendify-quick-edit-mode-browse');
			if (frame.content?.mode) frame.content.mode('browse');
		});
		const cleanup = () => {
			frame.modal?.$el?.removeClass('extendify-quick-edit-mode-browse');
		};
		frame.on('close', cleanup);

		let pickedAndSaving = false;
		frame.on('select', async () => {
			pickedAndSaving = true;
			const att = frame.state().get('selection').first()?.toJSON();
			if (!att?.id) {
				onAfterSave(false);
				return;
			}
			try {
				await saveProduct({
					productId,
					field: 'image',
					value: att.id,
				});
				if (beforeImageId.current && beforeImageId.current !== att.id) {
					pushUndo({
						kind: 'product-image',
						productReplay: true,
						productId,
						field: 'image',
						beforeValue: beforeImageId.current,
					});
				}
				track('save', { kind: 'product', field: 'image' });
				onAfterSave(true);
			} catch (_err) {
				track('save_failed', { kind: 'product', field: 'image' });
				onAfterSave(false);
			}
		});
		frame.on('close', () => {
			if (!pickedAndSaving) onAfterSave(false);
		});
		frame.open();

		return () => {
			cleanup();
		};
	}, [productId, onAfterSave]);

	return null;
};
