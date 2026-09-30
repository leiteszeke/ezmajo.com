import { track } from '@shared/lib/track';
import {
	Button,
	Modal,
	Notice,
	Spinner,
	TextareaControl,
	TextControl,
	ToggleControl,
} from '@wordpress/components';
import { useEffect, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { loadWpFormsField, saveWpFormsField } from '../../lib/api';
import { useCmdEnterSave } from '../../lib/cmd-enter-save';
import { friendlyMessage } from '../../lib/errors';
import { QE_MODAL_BODY_OPEN_CLASS } from '../../lib/modal-root';
import { pushUndo } from '../../state/undo';
import { ModalCloseButton } from './ModalCloseButton';

export const WPFormsFieldModal = ({ formId, fieldId, onAfterSave }) => {
	const [data, setData] = useState(null);
	const [loadError, setLoadError] = useState(null);
	const [label, setLabel] = useState('');
	const [placeholder, setPlaceholder] = useState('');
	const [description, setDescription] = useState('');
	const [required, setRequired] = useState(false);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState(null);

	useEffect(() => {
		loadWpFormsField({ formId, fieldId })
			.then((res) => {
				setData(res);
				setLabel(String(res.label || ''));
				setPlaceholder(String(res.placeholder || ''));
				setDescription(String(res.description || ''));
				setRequired(!!res.required);
			})
			.catch((err) => setLoadError(friendlyMessage(err)));
	}, [formId, fieldId]);

	// `name` is composite (its sub-labels stand in for placeholder).
	const supportsPlaceholder =
		data?.type !== 'name' &&
		data?.type !== 'select' &&
		data?.type !== 'checkbox' &&
		data?.type !== 'radio';

	const handleSave = async () => {
		if (saving || !data) return;
		const changes = {};
		const beforeChanges = {};
		if (label !== (data.label || '')) {
			changes.label = label;
			beforeChanges.label = data.label || '';
		}
		if (placeholder !== (data.placeholder || '')) {
			changes.placeholder = placeholder;
			beforeChanges.placeholder = data.placeholder || '';
		}
		if (description !== (data.description || '')) {
			changes.description = description;
			beforeChanges.description = data.description || '';
		}
		if (required !== !!data.required) {
			changes.required = required;
			beforeChanges.required = !!data.required;
		}
		if (Object.keys(changes).length === 0) {
			onAfterSave(false);
			return;
		}
		setSaving(true);
		setError(null);
		try {
			await saveWpFormsField({ formId, fieldId, changes });
			pushUndo({
				kind: 'wpforms-field',
				wpformsReplay: true,
				formId,
				fieldId,
				changes: beforeChanges,
			});
			track('save', { kind: 'wpforms_field', type: data.type });
			onAfterSave(true);
		} catch (err) {
			track('save_failed', { kind: 'wpforms_field', type: data?.type });
			setError(friendlyMessage(err));
			setSaving(false);
		}
	};
	useCmdEnterSave(handleSave, !!data && !saving);

	return (
		<Modal
			title={__('Edit form field', 'extendify-local')}
			onRequestClose={() => onAfterSave(false)}
			isDismissible={false}
			headerActions={<ModalCloseButton onClick={() => onAfterSave(false)} />}
			className="extendify-quick-edit-modal extendify-quick-edit-modal-wpforms"
			overlayClassName="extendify-quick-edit"
			bodyOpenClassName={QE_MODAL_BODY_OPEN_CLASS}
			size="medium"
		>
			{loadError ? (
				<Notice status="error" isDismissible={false}>
					{loadError}
				</Notice>
			) : null}
			{error ? (
				<Notice status="error" isDismissible={false}>
					{error}
				</Notice>
			) : null}
			{!data && !loadError ? <Spinner /> : null}
			{data ? (
				<>
					<TextControl
						__nextHasNoMarginBottom
						label={__('Label', 'extendify-local')}
						value={label}
						onChange={setLabel}
						autoFocus
					/>
					{supportsPlaceholder ? (
						<TextControl
							__nextHasNoMarginBottom
							label={__('Placeholder', 'extendify-local')}
							value={placeholder}
							onChange={setPlaceholder}
						/>
					) : null}
					<TextareaControl
						__nextHasNoMarginBottom
						label={__('Description (shown below the field)', 'extendify-local')}
						value={description}
						onChange={setDescription}
						rows={3}
					/>
					<ToggleControl
						__nextHasNoMarginBottom
						label={__('Required field', 'extendify-local')}
						checked={required}
						onChange={setRequired}
					/>
				</>
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
