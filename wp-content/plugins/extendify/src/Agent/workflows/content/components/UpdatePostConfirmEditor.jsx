import { useEffect } from '@wordpress/element';

export const UpdatePostConfirmEditor = ({ inputs, onConfirm }) => {
	useEffect(() => {
		const id = requestAnimationFrame(() => {
			onConfirm({ data: inputs });
		});
		return () => cancelAnimationFrame(id);
	}, [inputs, onConfirm]);

	return null;
};
