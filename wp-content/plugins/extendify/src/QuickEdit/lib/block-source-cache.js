// Caches the in-flight Promise (not the resolved value) so concurrent
// hover-prefetch + click consumers share one request.
import apiFetch from '@wordpress/api-fetch';
import { addQueryArgs } from '@wordpress/url';

const cache = new Map();

// Resolve a source descriptor + block id into the get-block-code query args and
// a collision-proof cache key. post and template-part sources number their
// blocks in separate spaces (post #5 ≠ header #5), so the key carries the kind
// and its discriminator. Returns null for sources QE loads through other
// editors (product, wpforms, wp-navigation) or for incomplete input.
const describe = (source, blockId) => {
	if (!source || !blockId) return null;
	if (source.kind === 'post' && source.id) {
		return {
			key: `post-${source.id}-${blockId}`,
			args: { postId: source.id, blockId },
		};
	}
	if (source.kind === 'template-part' && source.partSlug) {
		return {
			key: `part-${source.partSlug}-${blockId}`,
			args: { partSlug: source.partSlug, blockId },
		};
	}
	return null;
};

export const prefetchBlockSource = (source, blockId) => {
	const desc = describe(source, blockId);
	if (!desc) return null;
	if (cache.has(desc.key)) return cache.get(desc.key);
	const promise = apiFetch({
		path: addQueryArgs('/extendify/v1/agent/get-block-code', desc.args),
	}).catch((err) => {
		// Evict on failure so the next consumer (typically BlockTextEditor)
		// retries fresh and surfaces the error.
		cache.delete(desc.key);
		throw err;
	});
	cache.set(desc.key, promise);
	return promise;
};

// Same shape as prefetch but semantically "I need this now."
export const getBlockSource = prefetchBlockSource;

// Drop a stale entry after a save — splice rewrites the live DOM but the
// cached source payload is still pre-save, so a re-edit would mount the
// editor against the old markup.
export const invalidateBlockSource = (source, blockId) => {
	const desc = describe(source, blockId);
	if (!desc) return;
	cache.delete(desc.key);
};
