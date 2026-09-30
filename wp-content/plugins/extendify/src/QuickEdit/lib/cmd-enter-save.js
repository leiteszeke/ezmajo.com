import { useEffect } from '@wordpress/element';

export const useCmdEnterSave = (onSave, enabled = true) => {
	useEffect(() => {
		if (!enabled) return undefined;
		const handler = (e) => {
			if (e.key !== 'Enter') return;
			if (!(e.metaKey || e.ctrlKey)) return;
			e.preventDefault();
			e.stopPropagation();
			onSave?.();
		};
		window.addEventListener('keydown', handler, true);
		return () => window.removeEventListener('keydown', handler, true);
	}, [onSave, enabled]);
};
