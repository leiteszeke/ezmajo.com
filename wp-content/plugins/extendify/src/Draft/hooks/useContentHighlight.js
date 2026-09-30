import { useDispatch, useSelect } from '@wordpress/data';

export const useContentHighlight = () => {
	const { getBlockInsertionPoint } = useSelect(
		(select) => select('core/block-editor'),
		[],
	);
	const { toggleBlockHighlight, showInsertionPoint, hideInsertionPoint } =
		useDispatch('core/block-editor');

	const toggleHighlight = (clientIds, { isHighlighted }) => {
		toggleBlockHighlight(clientIds[0], isHighlighted);
	};

	const toggleInsertionPoint = ({ isVisible }) => {
		if (!isVisible) {
			hideInsertionPoint();
			return;
		}
		const { rootClientId, index } = getBlockInsertionPoint();
		showInsertionPoint(rootClientId, index);
	};

	return { toggleHighlight, toggleInsertionPoint };
};
