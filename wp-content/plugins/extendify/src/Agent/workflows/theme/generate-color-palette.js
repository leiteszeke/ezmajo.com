import { Redirect } from '@agent/workflows/theme/components/Redirect';
import { SelectGeneratedPalette } from '@agent/workflows/theme/components/SelectGeneratedPalette';
import { __ } from '@wordpress/i18n';

const { context, abilities } = window.extAgentData;

export default {
	available: () => abilities?.canEditThemes,
	needsRedirect: () => !!context?.adminPage || !Number(context?.postId || 0),
	redirectComponent: () =>
		Redirect(
			__(
				'It looks like you are trying to change your site colors, but you are not on a page where we can do that.',
				'extendify-local',
			),
		),
	id: 'generate-color-palette',
	whenFinished: {
		component: SelectGeneratedPalette,
	},
};
