import { isAbilityTool } from '@agent/lib/abilities';
import { __, sprintf } from '@wordpress/i18n';

const placedImage = ({ id, inputs, result }) => {
	if (id === 'acquire-image') return result?.id;
	if (id !== 'block-patching') return null;
	return inputs?.operations?.find(
		(operation) => operation?.op === 'replace-image',
	)?.image?.id;
};

export default {
	id: 'optimize-image',
	follows: '*',
	data: ({ toolCalls }) => {
		const mediaId = toolCalls.map(placedImage).findLast(Boolean);
		return mediaId ? { mediaId } : null;
	},
	// Imagify registers its abilities even with no account connected.
	score: ({ data, context }) =>
		data && context?.hasImagifyApiKey && isAbilityTool('imagify/optimize-media')
			? 3
			: 0,
	content: ({ mediaId }) => ({
		// translators: Title of a card in the AI Agent chat, shown after the user added an image to their website.
		title: __('Optimize your new image', 'extendify-local'),
		// translators: Body of a card in the AI Agent chat. Imagify is the name of an image optimization plugin.
		body: __(
			'Imagify can make the file smaller so your page loads faster.',
			'extendify-local',
		),
		action: {
			// translators: Button on a card in the AI Agent chat that starts optimizing an image with the Imagify plugin.
			label: __('Optimize image', 'extendify-local'),
			// The next run doesn't see this run's tool calls.
			message: sprintf(
				// translators: %d is the ID of an image in the WordPress media library. Shown in the AI Agent chat as the user's own request. Imagify is the name of an image optimization plugin.
				__('Optimize the image with ID %d using Imagify', 'extendify-local'),
				mediaId,
			),
		},
	}),
};
