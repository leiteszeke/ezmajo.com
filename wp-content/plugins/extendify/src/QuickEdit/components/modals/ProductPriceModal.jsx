import { track } from '@shared/lib/track';
import {
	Button,
	Modal,
	Notice,
	Spinner,
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

export const ProductPriceModal = ({ productId, onAfterSave }) => {
	const [data, setData] = useState(null);
	const [original, setOriginal] = useState({ regular: '', sale: '' });
	const [regular, setRegular] = useState('');
	const [sale, setSale] = useState('');
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState(null);

	useEffect(() => {
		loadProduct(productId)
			.then((res) => {
				setData(res);
				const o = {
					regular: res.regular_price || '',
					sale: res.sale_price || '',
				};
				setOriginal(o);
				setRegular(o.regular);
				setSale(o.sale);
			})
			.catch((err) => setError(friendlyMessage(err)));
	}, [productId]);

	const handleSave = async () => {
		if (saving || !data) return;
		if (regular === original.regular && sale === original.sale) {
			onAfterSave(false);
			return;
		}
		setSaving(true);
		setError(null);
		try {
			await saveProduct({
				productId,
				field: 'price',
				value: { regular, sale },
			});
			pushUndo({
				kind: 'product-price',
				productReplay: true,
				productId,
				field: 'price',
				beforeValue: original,
			});
			track('save', { kind: 'product', field: 'price' });
			onAfterSave(true);
		} catch (err) {
			track('save_failed', { kind: 'product', field: 'price' });
			setError(friendlyMessage(err));
			setSaving(false);
		}
	};
	useCmdEnterSave(handleSave, !!data && !saving);

	const currency = window.extQuickEditData?.context?.currencySymbol || '$';

	return (
		<Modal
			title={__('Edit price', 'extendify-local')}
			onRequestClose={() => onAfterSave(false)}
			isDismissible={false}
			headerActions={<ModalCloseButton onClick={() => onAfterSave(false)} />}
			className="extendify-quick-edit-modal extendify-quick-edit-modal-price"
			overlayClassName="extendify-quick-edit"
			bodyOpenClassName={QE_MODAL_BODY_OPEN_CLASS}
			size="small"
		>
			{error ? (
				<Notice status="error" isDismissible={false}>
					{error}
				</Notice>
			) : null}
			{!data && !error ? <Spinner /> : null}
			{data ? (
				<div className="extendify-quick-edit-price-fields">
					<div className="extendify-quick-edit-price-row">
						<span className="extendify-quick-edit-price-prefix">
							{currency}
						</span>
						<TextControl
							__nextHasNoMarginBottom
							label={__('Regular price', 'extendify-local')}
							value={regular}
							onChange={setRegular}
							placeholder="0.00"
							autoFocus
						/>
					</div>
					<div className="extendify-quick-edit-price-row">
						<span className="extendify-quick-edit-price-prefix">
							{currency}
						</span>
						<TextControl
							__nextHasNoMarginBottom
							label={__('Sale price (optional)', 'extendify-local')}
							value={sale}
							onChange={setSale}
							placeholder="0.00"
						/>
					</div>
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
