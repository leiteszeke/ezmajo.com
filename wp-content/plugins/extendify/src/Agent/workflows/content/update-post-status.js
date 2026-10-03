import { UpdatePostStatusConfirm } from '@agent/workflows/content/components/UpdatePostStatusConfirm';
import { __ } from '@wordpress/i18n';

const { context, abilities } = window.extAgentData;

export default {
	available: () =>
		abilities?.canEditPosts && !context?.adminPage && context?.postId,
	id: 'update-post-status',
	whenFinished: { component: UpdatePostStatusConfirm },
	example: {
		text: __('Publish this page', 'extendify-local'),
		agentResponse: {
			// translators: Shown when the user clicks the "Publish this page" suggestion, above a confirm card.
			reply: __('Ready to publish this page?', 'extendify-local'),
			whenFinishedTool: {
				id: 'update-post-status',
				inputs: {
					postId: context?.postId,
					postType: context?.postType,
					updatedStatus: 'publish',
					postStatus: context?.postStatus,
				},
				labels: {
					confirm: __('Published the page', 'extendify-local'),
					cancel: __('Canceled publishing the page', 'extendify-local'),
				},
			},
		},
	},
};
