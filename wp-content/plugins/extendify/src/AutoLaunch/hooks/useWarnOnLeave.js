import { useEffect } from '@wordpress/element';

export const useWarnOnLeave = (enabled = true, callback) => {
	// Display warning alert if user tries to exit
	useEffect(() => {
		if (!enabled) return;
		const handleUnload = (event) => {
			event.preventDefault();
			callback?.();
			event.returnValue = '';
			return '';
		};
		const opts = { capture: true };
		window.addEventListener('beforeunload', handleUnload, opts);
		return () => {
			window.removeEventListener('beforeunload', handleUnload, opts);
		};
	}, [enabled]);
};
