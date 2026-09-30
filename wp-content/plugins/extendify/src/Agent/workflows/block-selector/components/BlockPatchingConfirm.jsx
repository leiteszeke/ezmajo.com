import { ReplaceImageConfirm } from '@agent/workflows/block-selector/components/ReplaceImageConfirm';
import { UpdateBlockConfirm } from '@agent/workflows/block-selector/components/UpdateBlockConfirm';

// The backend never mixes replace-image with other ops, so a pure image
// batch gets the dedicated generate/upload UI.
export const BlockPatchingConfirm = (props) => {
	const operations = props.inputs?.operations;
	const onlyImages =
		Array.isArray(operations) &&
		operations.length > 0 &&
		operations.every((operation) => operation?.op === 'replace-image');
	const Confirm = onlyImages ? ReplaceImageConfirm : UpdateBlockConfirm;
	return <Confirm {...props} />;
};
