import { track } from '@shared/lib/track';
import { __experimentalLinkControl as LinkControl } from '@wordpress/block-editor';
import { Button, Modal, Notice, TextControl } from '@wordpress/components';
import { useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { save, saveWpNavigationItem } from '../../lib/api';
import { useCmdEnterSave } from '../../lib/cmd-enter-save';
import { friendlyMessage } from '../../lib/errors';
import { normalizeText } from '../../lib/fingerprint';
import { closeModal, QE_MODAL_BODY_OPEN_CLASS } from '../../lib/modal-root';
import { pushUndo } from '../../state/undo';
import { ModalCloseButton } from './ModalCloseButton';

const readNavAttrs = (liveEl) => {
	const a = liveEl.querySelector('a[href]');
	const url = a?.getAttribute('href') || '';
	const labelEl =
		liveEl.querySelector('.wp-block-navigation-item__label') ||
		liveEl.querySelector('a');
	const label = (labelEl?.textContent || '').trim();
	return { label, url };
};

export const NavItemModal = ({ selected, onAfterSave }) => {
	const initial = readNavAttrs(selected.el);
	const [label, setLabel] = useState(initial.label);
	const [url, setUrl] = useState('');
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState(null);

	const handleSave = async () => {
		if (saving) return;
		setSaving(true);
		setError(null);
		// Empty URL keeps the existing link — typo on label alone shouldn't break it.
		const finalUrl = url || initial.url;
		const patches = [];
		if (label !== initial.label) {
			patches.push({ fieldKey: 'label', value: label });
		}
		if (finalUrl !== initial.url) {
			patches.push({ fieldKey: 'url', value: finalUrl });
		}
		if (patches.length === 0) {
			onAfterSave(false);
			return;
		}
		// The clicked item's label is its render-time identity; the server
		// refuses (409) when itemIndex / blockId resolves to a different item.
		const fingerprint = initial.label
			? { text: normalizeText(initial.label) }
			: null;
		try {
			// Two save paths share the same `attrs.label` / `attrs.url`
			// patch shape (handled by `Schemas\NavigationLink`):
			//
			//   - INLINE items (a navigation block whose items are real
			//     innerBlocks of the host post/template-part) →
			//     `/quick-edit/save` (resolved by SaveController's
			//     findBlock walk).
			//
			//   - REF items (a navigation block with a `ref` attr →
			//     items live in a separate `wp_navigation` CPT post) →
			//     `/quick-edit/wp-navigation` (this is what the user
			//     hit when About/Contact failed: the host tree skips
			//     past the navigation block because `innerBlocks` is
			//     empty for ref-based navs, so findBlock can't reach
			//     the items).
			//
			// resolveTarget hands us `selected.source.kind = 'wp-
			// navigation'` for the ref case, with navPostId + itemIndex
			// already populated from `NavRefTagger` data attributes.
			if (selected.source?.kind === 'wp-navigation') {
				await saveWpNavigationItem({
					navPostId: selected.navPostId,
					itemIndex: selected.itemIndex,
					blockType: selected.blockType,
					fingerprint,
					patches,
				});
			} else {
				await save({
					source: selected.source,
					blockId: selected.blockId,
					blockType: selected.blockType,
					fingerprint,
					patches,
				});
			}
			// Push the undo entry shaped to match the FORWARD-save
			// endpoint we just used — `performUndo` dispatches on
			// the replay flag, so wp-navigation undos must carry
			// navPostId + itemIndex + blockType + patches; the
			// regular nav-item undo carries source/blockId/etc.
			const beforePatches = [
				{ fieldKey: 'label', value: initial.label },
				{ fieldKey: 'url', value: initial.url },
			];
			if (selected.source?.kind === 'wp-navigation') {
				pushUndo({
					kind: 'nav-item',
					navReplay: true,
					navPostId: selected.navPostId,
					itemIndex: selected.itemIndex,
					blockType: selected.blockType,
					patches: beforePatches,
				});
			} else {
				pushUndo({
					kind: 'nav-item',
					source: selected.source,
					blockId: selected.blockId,
					blockType: selected.blockType,
					patches: beforePatches,
				});
			}
			track('save', { kind: 'nav_item' });
			onAfterSave(true);
		} catch (err) {
			track('save_failed', { kind: 'nav_item' });
			setError(friendlyMessage(err));
			setSaving(false);
		}
	};
	useCmdEnterSave(handleSave, !saving);

	const linkField = LinkControl ? (
		<div className="extendify-quick-edit-link-field">
			<div className="extendify-quick-edit-modal-label">
				{__('Pick a new destination', 'extendify-local')}
			</div>
			{initial.url ? (
				<div className="extendify-quick-edit-link-current">
					<span>{__('Currently linked to:', 'extendify-local')}</span>{' '}
					<code>{initial.url}</code>
				</div>
			) : null}
			{/* LinkControl reads the global core/block-editor settings, not
			    its own props — fetchSearchSuggestions wires up at boot. */}
			<LinkControl
				value={{ url }}
				onChange={(v) => setUrl(v?.url || '')}
				forceIsEditingLink
				hasTextControl={false}
				showInitialSuggestions
				settings={[]}
				suggestionsQuery={{ type: 'post', subtype: 'page' }}
			/>
		</div>
	) : (
		<TextControl
			__nextHasNoMarginBottom
			autoFocus
			label={__('URL', 'extendify-local')}
			value={url}
			onChange={setUrl}
			placeholder={initial.url}
		/>
	);

	return (
		<Modal
			title={__('Edit navigation link', 'extendify-local')}
			onRequestClose={() => onAfterSave(false)}
			isDismissible={false}
			headerActions={<ModalCloseButton onClick={() => onAfterSave(false)} />}
			className="extendify-quick-edit-modal extendify-quick-edit-modal-nav"
			overlayClassName="extendify-quick-edit"
			bodyOpenClassName={QE_MODAL_BODY_OPEN_CLASS}
			size="medium"
		>
			{error ? (
				<Notice status="error" isDismissible={false}>
					{error}
				</Notice>
			) : null}
			<TextControl
				__nextHasNoMarginBottom
				label={__('Label', 'extendify-local')}
				value={label}
				onChange={setLabel}
			/>
			{linkField}
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

export const openNavItemModal = (selected) => {
	const handleClose = (didSave) => closeModal(didSave);
	return <NavItemModal selected={selected} onAfterSave={handleClose} />;
};
