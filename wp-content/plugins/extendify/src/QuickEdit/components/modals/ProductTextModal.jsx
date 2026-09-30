import { track } from '@shared/lib/track';
import {
	Button,
	Modal,
	Notice,
	Spinner,
	TextareaControl,
	TextControl,
} from '@wordpress/components';
import { useEffect, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { loadProduct, saveProduct } from '../../lib/api';
import { useCmdEnterSave } from '../../lib/cmd-enter-save';
import { friendlyMessage } from '../../lib/errors';
import { QE_MODAL_BODY_OPEN_CLASS } from '../../lib/modal-root';
import { pushUndo } from '../../state/undo';
import { ModalCloseButton } from './ModalCloseButton';

const TITLES = {
	name: __('Edit product name', 'extendify-local'),
	short_description: __('Edit short description', 'extendify-local'),
	description: __('Edit description', 'extendify-local'),
};

export const ProductTextModal = ({ productId, field, onAfterSave }) => {
	const [data, setData] = useState(null);
	const [originalValue, setOriginalValue] = useState('');
	const [value, setValue] = useState('');
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState(null);

	useEffect(() => {
		loadProduct(productId)
			.then((res) => {
				setData(res);
				let v = res[field] || '';
				// When the product has no short description but the page is
				// showing the long-description fallback above the price (WC's
				// `woocommerce/product-summary` block does this via
				// `showDescriptionIfEmpty`), the modal would open empty even
				// though the user sees text. Pre-fill with the long description
				// so editing matches what's displayed; save still writes to
				// post_excerpt — once saved the product has a real short
				// description and future opens show it directly.
				if (field === 'short_description' && !v && res.description) {
					v = res.description;
				}
				setOriginalValue(v);
				setValue(v);
			})
			.catch((err) => setError(friendlyMessage(err)));
	}, [productId, field]);

	const handleSave = async () => {
		if (saving || !data) return;
		if (value === originalValue) {
			onAfterSave(false);
			return;
		}
		setSaving(true);
		setError(null);
		try {
			await saveProduct({ productId, field, value });
			pushUndo({
				kind: 'product',
				productReplay: true,
				productId,
				field,
				beforeValue: originalValue,
			});
			track('save', { kind: 'product', field });
			onAfterSave(true);
		} catch (err) {
			track('save_failed', { kind: 'product', field });
			setError(friendlyMessage(err));
			setSaving(false);
		}
	};
	useCmdEnterSave(handleSave, !!data && !saving);

	return (
		<Modal
			title={TITLES[field] || __('Edit product field', 'extendify-local')}
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
			{data && field === 'name' ? (
				<TextControl
					__nextHasNoMarginBottom
					label={__('Product name', 'extendify-local')}
					value={value}
					onChange={setValue}
					autoFocus
				/>
			) : null}
			{data && field === 'short_description' ? (
				<TextareaControl
					__nextHasNoMarginBottom
					label={__('Short description', 'extendify-local')}
					value={value}
					onChange={setValue}
					rows={6}
					autoFocus
				/>
			) : null}
			{data && field === 'description' ? (
				<TextareaControl
					__nextHasNoMarginBottom
					label={__('Description', 'extendify-local')}
					value={value}
					onChange={setValue}
					rows={14}
					autoFocus
				/>
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
