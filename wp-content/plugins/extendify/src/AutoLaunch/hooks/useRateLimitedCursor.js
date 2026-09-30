import { useEffect, useRef } from '@wordpress/element';

export const useRateLimitedCursor = (cb, intervalMs = 2000, deps = []) => {
	const lastAtRef = useRef(0);
	const timerRef = useRef(null);

	useEffect(() => {
		const schedule = () => {
			clearTimeout(timerRef.current);

			const now = Date.now();
			const wait = Math.max(0, lastAtRef.current + intervalMs - now);

			const run = () => {
				lastAtRef.current = Date.now();
				const hasMore = cb();
				if (hasMore) schedule();
			};

			if (wait === 0) run();
			else timerRef.current = setTimeout(run, wait);
		};

		schedule();

		return () => {
			clearTimeout(timerRef.current);
			timerRef.current = null;
		};
	}, [cb, intervalMs, ...deps]);
};
