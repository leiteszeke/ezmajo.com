import { track } from '@shared/lib/track';
import { Button, Modal, Notice, TextControl } from '@wordpress/components';
import { useState } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import { save } from '../../lib/api';
import { useCmdEnterSave } from '../../lib/cmd-enter-save';
import { friendlyMessage } from '../../lib/errors';
import { closeModal, QE_MODAL_BODY_OPEN_CLASS } from '../../lib/modal-root';
import { pushUndo } from '../../state/undo';
import { ModalCloseButton } from './ModalCloseButton';

const niceService = (slug) => {
	if (!slug) return '';
	return slug.charAt(0).toUpperCase() + slug.slice(1);
};

const readSocialAttrs = (liveEl) => {
	let service = '';
	for (const cls of liveEl.classList) {
		const m = /^wp-social-link-(.+)$/.exec(cls);
		if (m) {
			service = m[1];
			break;
		}
	}
	const a = liveEl.querySelector('a[href]');
	const url = a?.getAttribute('href') || '';
	return { service, url };
};

export const SocialLinkModal = ({ selected, onAfterSave }) => {
	const initial = readSocialAttrs(selected.el);
	const [url, setUrl] = useState(initial.url);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState(null);

	const handleSave = async () => {
		if (saving) return;
		setSaving(true);
		setError(null);
		try {
			// blockId from TagTemplateParts can drift when the template-part
			// contains a ref-based navigation (the render-time counter
			// double-counts nav items via render_block's fallback path).
			// `service` is effectively unique per social-link in a part, so
			// send it as a fingerprint and let the server fall back to
			// service-matching when count-based lookup misses.
			const fingerprint = initial.service ? { service: initial.service } : null;
			await save({
				source: selected.source,
				blockId: selected.blockId,
				blockType: selected.blockType,
				fingerprint,
				patches: [{ fieldKey: 'url', value: url }],
			});
			if (url !== initial.url) {
				pushUndo({
					kind: 'social-link',
					source: selected.source,
					blockId: selected.blockId,
					blockType: selected.blockType,
					fingerprint,
					patches: [{ fieldKey: 'url', value: initial.url }],
				});
			}
			track('save', { kind: 'social_link', service: initial.service });
			onAfterSave(true);
		} catch (err) {
			track('save_failed', { kind: 'social_link', service: initial.service });
			setError(friendlyMessage(err));
			setSaving(false);
		}
	};
	useCmdEnterSave(handleSave, !saving);

	const title = initial.service
		? sprintf(
				// translators: %s is the social network name, e.g. "Facebook".
				__('Edit %s link', 'extendify-local'),
				niceService(initial.service),
			)
		: __('Edit social link', 'extendify-local');

	return (
		<Modal
			title={title}
			onRequestClose={() => onAfterSave(false)}
			isDismissible={false}
			headerActions={<ModalCloseButton onClick={() => onAfterSave(false)} />}
			className="extendify-quick-edit-modal"
			overlayClassName="extendify-quick-edit"
			bodyOpenClassName={QE_MODAL_BODY_OPEN_CLASS}
			size="small"
		>
			{error ? (
				<Notice status="error" isDismissible={false}>
					{error}
				</Notice>
			) : null}
			<TextControl
				__nextHasNoMarginBottom
				autoFocus
				label={__('URL', 'extendify-local')}
				value={url}
				type="url"
				placeholder="https://"
				onChange={setUrl}
			/>
			<div className="extendify-quick-edit-modal-actions">
				<Button variant="tertiary" onClick={() => onAfterSave(false)}>
					{__('Cancel', 'extendify-local')}
				</Button>
				<Button
					variant="primary"
					isBusy={saving}
					disabled={saving}
					onClick={handleSave}
				>
					{__('Save', 'extendify-local')}
				</Button>
			</div>
		</Modal>
	);
};

export const openSocialLinkModal = (selected) => {
	const handleClose = (didSave) => closeModal(didSave);
	return <SocialLinkModal selected={selected} onAfterSave={handleClose} />;
};
