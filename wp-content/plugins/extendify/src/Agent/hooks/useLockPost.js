import apiFetch from '@wordpress/api-fetch';
import { useEffect } from '@wordpress/element';

export const useLockPost = ({ postId, enabled }) => {
	useEffect(() => {
		if (!postId || !enabled) return;
		let timeoutId;
		const lockPost = async () => {
			await apiFetch({
				path: '/extendify/v1/agent/lock-post',
				method: 'POST',
				data: { postId },
			}).catch(() => undefined);
			// Send lock post signal every 2 minutes (must be under WP's 150s lock expiry)
			timeoutId = setTimeout(lockPost, 2 * 60 * 1000);
		};
		lockPost();
		return () => clearTimeout(timeoutId);
	}, [postId, enabled]);
};
