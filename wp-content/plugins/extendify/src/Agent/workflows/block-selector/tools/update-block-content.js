import { healBlockMarkup } from '@agent/lib/heal-blocks';
import { ensureCoreBlocksRegistered } from '@agent/lib/register-blocks';
import apiFetch from '@wordpress/api-fetch';

// TODO: check for post_lock and error that someone is editing
export default async ({ previousContent, newContent }) => {
	await ensureCoreBlocksRegistered();
	const { postType, postId } = window.extAgentData.context;

	const type = await apiFetch({
		path: `/wp/v2/types/${encodeURIComponent(postType)}`,
	});
	const base = type?.rest_base || `${postType}s`;

	const response = await apiFetch({
		path: `/wp/v2/${base}/${postId}?context=edit`,
	});

	const content = response.content.raw.replace(
		previousContent,
		healBlockMarkup(newContent),
	);

	// A string-replace that matched nothing writes the post back unchanged;
	// refuse so the user sees a retry prompt instead of a false success.
	if (content === response.content.raw) {
		return { refused: true, reason: 'no-op' };
	}

	await apiFetch({
		path: `/wp/v2/${base}/${postId}`,
		method: 'POST',
		data: { content },
	});
};
