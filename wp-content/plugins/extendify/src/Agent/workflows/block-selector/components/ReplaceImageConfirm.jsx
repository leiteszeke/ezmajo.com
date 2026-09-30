import {
	ImagePicker,
	PickerActions,
	PickerButton,
} from '@agent/components/ImagePicker';
import { SharedBlockNotice } from '@agent/components/SharedBlockNotice';
import { targetFor } from '@agent/hooks/useImageAcquisition';
import { BLOCK_ID_SEL, findBlockEl } from '@agent/lib/block-el';
import { useChatStore } from '@agent/state/chat';
import { useQuickEditStore } from '@quick-edit/state/store';
import { useCallback, useEffect, useRef } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

// The block's own image — never one belonging to a nested tagged block.
const findBlockImage = (blockId, partSlug) => {
	const scope = findBlockEl(blockId, document, { partSlug });
	if (!scope) return null;
	return (
		[...scope.querySelectorAll('img')].find(
			(img) => img.closest(BLOCK_ID_SEL) === scope,
		) ?? null
	);
};

export const ReplaceImageConfirm = ({ inputs, onConfirm, onCancel }) => {
	// The backend caps a patch at one image; a second would have no picker.
	const operation = (
		Array.isArray(inputs.operations) ? inputs.operations : []
	).find(({ op }) => op === 'replace-image');
	const blockId = operation?.blockId;
	const original = useRef(null);
	const confirmed = useRef(false);
	const addMessage = useChatStore((state) => state.addMessage);
	const updateMessage = useChatStore((state) => state.updateMessage);
	// A part block's id repeats in post content, so the scope picks the instance.
	const partSlug =
		useQuickEditStore((state) => state.agentBlock?.source?.partSlug) ?? null;

	const restoreOriginal = useCallback(() => {
		const saved = original.current;
		if (!saved) return;
		saved.el.src = saved.src;
		if (saved.srcset) saved.el.setAttribute('srcset', saved.srcset);
		else saved.el.removeAttribute('srcset');
	}, []);

	const previewOnPage = useCallback(
		(url) => {
			const img = findBlockImage(blockId, partSlug);
			if (!img) return;
			original.current ??= {
				el: img,
				src: img.getAttribute('src') ?? '',
				srcset: img.getAttribute('srcset') ?? '',
			};
			if (!url) {
				restoreOriginal();
				return;
			}
			img.removeAttribute('srcset');
			img.src = url;
		},
		[blockId, partSlug, restoreOriginal],
	);

	// Nothing on the page means there is nothing to replace.
	const receipt = useRef(null);
	useEffect(() => {
		if (!findBlockImage(blockId, partSlug)) return onCancel();
		receipt.current ??= addMessage('image', {});
	}, [blockId, partSlug, onCancel, addMessage]);

	useEffect(() => {
		return () => {
			if (confirmed.current) return;
			restoreOriginal();
		};
	}, [restoreOriginal]);

	if (!operation) return null;

	return (
		<ImagePicker
			prompt={operation.prompt ?? ''}
			search={operation.prompt ?? ''}
			tab={operation.source === 'generate' ? 'generate' : 'media'}
			autoGenerate={operation.source === 'generate'}
			target={() => targetFor(findBlockImage(blockId, partSlug))}
			onSelect={previewOnPage}
			onSubmit={async (image) => {
				confirmed.current = true;
				const url = image?.source_url || image?.url;
				if (url) updateMessage(receipt.current, { url });
				// The full attachment is ~800 tokens replayed every turn.
				// swapBlockImage builds the block's alt from alt_text.
				const picked = image && {
					id: image.id,
					url,
					alt_text: image.alt_text ?? '',
				};
				await onConfirm({
					// No image resolved — the tool reports it as no-change.
					data: {
						...inputs,
						operations: [picked ? { ...operation, image: picked } : operation],
					},
					shouldRefreshPage: true,
				});
			}}
			footer={({ ready, busy, submit }) => (
				<>
					<SharedBlockNotice blockIds={[blockId]} />
					<PickerActions>
						<PickerButton disabled={busy} onClick={onCancel}>
							{__('Cancel', 'extendify-local')}
						</PickerButton>
						<PickerButton primary disabled={!ready || busy} onClick={submit}>
							{busy
								? __('Saving...', 'extendify-local')
								: __('Save', 'extendify-local')}
						</PickerButton>
					</PickerActions>
				</>
			)}
		/>
	);
};
