import {
	addCustomMediaViewsCss,
	removeCustomMediaViewsCss,
} from '@shared/lib/media-views';
import { track } from '@shared/lib/track';
import { MediaUpload } from '@wordpress/block-editor';
import {
	Button,
	Modal,
	Notice,
	Spinner,
	TextControl,
} from '@wordpress/components';
import { useEffect, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { loadSiteIdentity, saveSiteIdentity } from '../../lib/api';
import { useCmdEnterSave } from '../../lib/cmd-enter-save';
import { friendlyMessage } from '../../lib/errors';
import { closeModal, QE_MODAL_BODY_OPEN_CLASS } from '../../lib/modal-root';
import { pushUndo } from '../../state/undo';
import { ModalCloseButton } from './ModalCloseButton';

const TITLES = {
	title: __('Site title', 'extendify-local'),
	tagline: __('Tagline', 'extendify-local'),
	logo: __('Site logo', 'extendify-local'),
};

export const SiteIdentityModal = ({ kind, onAfterSave }) => {
	const [data, setData] = useState(null);
	// Static snapshot for the undo before-state.
	const [originalData, setOriginalData] = useState(null);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState(null);

	useEffect(() => {
		loadSiteIdentity()
			.then((res) => {
				setData(res);
				setOriginalData(res);
			})
			.catch((err) => setError(friendlyMessage(err)));
	}, []);

	// Logo is the only kind that opens wp.media (via MediaUpload). Armor its
	// chrome against the site theme's CSS bleed — same fix as InlineEditor's
	// image picker. See @shared/lib/media-views.
	useEffect(() => {
		if (kind !== 'logo') return undefined;
		addCustomMediaViewsCss();
		return () => removeCustomMediaViewsCss();
	}, [kind]);

	const handleSave = async () => {
		if (saving || !data) return;
		setSaving(true);
		setError(null);
		const payload = {};
		const beforeValues = {};
		if (kind === 'title') {
			payload.title = data.title;
			beforeValues.title = originalData ? originalData.title : '';
		}
		if (kind === 'tagline') {
			payload.tagline = data.tagline;
			beforeValues.tagline = originalData ? originalData.tagline : '';
		}
		if (kind === 'logo') {
			payload.logo_id = data.logo_id;
			beforeValues.logo_id = originalData ? originalData.logo_id : 0;
		}
		if (
			originalData &&
			JSON.stringify(beforeValues) === JSON.stringify(payload)
		) {
			onAfterSave(false);
			return;
		}
		try {
			await saveSiteIdentity(payload);
			pushUndo({
				kind: 'site-identity',
				identityKind: kind,
				beforeValues,
				// Routes performUndo through saveSiteIdentity instead of SaveController.
				identityReplay: true,
			});
			track('save', { kind: 'site_identity', field: kind });
			onAfterSave(true);
		} catch (err) {
			track('save_failed', { kind: 'site_identity', field: kind });
			setError(friendlyMessage(err));
			setSaving(false);
		}
	};
	useCmdEnterSave(handleSave, !!data && !saving);

	return (
		<Modal
			title={TITLES[kind] || __('Site identity', 'extendify-local')}
			onRequestClose={() => onAfterSave(false)}
			isDismissible={false}
			headerActions={<ModalCloseButton onClick={() => onAfterSave(false)} />}
			className="extendify-quick-edit-modal"
			overlayClassName="extendify-quick-edit"
			bodyOpenClassName={QE_MODAL_BODY_OPEN_CLASS}
			size="medium"
		>
			{error ? (
				<Notice status="error" isDismissible={false}>
					{error}
				</Notice>
			) : null}
			{!data && !error ? <Spinner /> : null}
			{data && kind === 'title' ? (
				<TextControl
					__nextHasNoMarginBottom
					autoFocus
					label={__('Site title', 'extendify-local')}
					value={data.title || ''}
					onChange={(v) => setData({ ...data, title: v })}
				/>
			) : null}
			{data && kind === 'tagline' ? (
				<TextControl
					__nextHasNoMarginBottom
					autoFocus
					label={__('Tagline', 'extendify-local')}
					value={data.tagline || ''}
					onChange={(v) => setData({ ...data, tagline: v })}
				/>
			) : null}
			{data && kind === 'logo' ? (
				<div className="extendify-quick-edit-logo-row">
					{data.logo_url ? (
						<img
							src={data.logo_url}
							alt=""
							className="extendify-quick-edit-logo-preview"
						/>
					) : null}
					<MediaUpload
						onSelect={(m) =>
							setData({
								...data,
								logo_id: m.id,
								logo_url: m.sizes?.medium ? m.sizes.medium.url : m.url,
							})
						}
						allowedTypes={['image']}
						value={data.logo_id}
						render={({ open }) => (
							<div className="extendify-quick-edit-logo-buttons">
								<Button variant="secondary" onClick={open}>
									{data.logo_id
										? __('Change logo', 'extendify-local')
										: __('Choose logo', 'extendify-local')}
								</Button>
								{data.logo_id ? (
									<Button
										variant="tertiary"
										isDestructive
										onClick={() =>
											setData({ ...data, logo_id: 0, logo_url: '' })
										}
									>
										{__('Remove', 'extendify-local')}
									</Button>
								) : null}
							</div>
						)}
					/>
				</div>
			) : null}
			<div className="extendify-quick-edit-modal-actions">
				<Button variant="tertiary" onClick={() => onAfterSave(false)}>
					{__('Cancel', 'extendify-local')}
				</Button>
				<Button
					variant="primary"
					isBusy={saving}
					disabled={saving || !data}
					onClick={handleSave}
				>
					{__('Save', 'extendify-local')}
				</Button>
			</div>
		</Modal>
	);
};

export const openSiteIdentityModal = (kind) => {
	const handleClose = (didSave) => closeModal(didSave);
	return <SiteIdentityModal kind={kind} onAfterSave={handleClose} />;
};
