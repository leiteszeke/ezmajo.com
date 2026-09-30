import { Redirect } from '@agent/workflows/theme/components/Redirect';
import { SelectThemeFontsVariation } from '@agent/workflows/theme/components/SelectThemeFontsVariation';
import { __ } from '@wordpress/i18n';
import { typography } from '@wordpress/icons';

const { context, abilities } = window.extAgentData;

export default {
	available: () => abilities?.canEditThemes && context?.hasThemeVariations,
	needsRedirect: () => !Number(context?.postId || 0),
	redirectComponent: () =>
		Redirect(
			__(
				'It looks like you are trying to change your theme fonts, but you are not on a page where we can do that.',
				'extendify-local',
			),
		),
	id: 'change-theme-fonts-variation',
	whenFinished: {
		component: SelectThemeFontsVariation,
	},
	example: {
		// translators: "theme fonts" refers to the font variation for the current theme.
		text: __('Change website fonts', 'extendify-local'),
		agentResponse: {
			// translators: This message show above a UI where the user can select a different font variation for their theme.
			reply: __(
				'Below you can select a different font variation for your theme.',
				'extendify-local',
			),
			whenFinishedTool: {
				id: 'update-theme-fonts-variation',
				labels: {
					confirm: __('Updated the theme fonts', 'extendify-local'),
					cancel: __('Canceled the theme fonts update', 'extendify-local'),
				},
			},
		},
	},
	icon: typography,
};
