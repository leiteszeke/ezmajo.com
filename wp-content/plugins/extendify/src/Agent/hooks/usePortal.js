import { useEffect, useState } from '@wordpress/element';

export const usePortal = (id) => {
	const [node] = useState(() => {
		const existing = document.getElementById(id);
		if (existing) return existing;
		const el = Object.assign(document.createElement('div'), {
			className: 'extendify-agent',
			id,
		});
		return el;
	});

	useEffect(() => {
		document.getElementById('extendify-agent-main').prepend(node);
		return () => node.remove();
	}, [node]);

	return node;
};
