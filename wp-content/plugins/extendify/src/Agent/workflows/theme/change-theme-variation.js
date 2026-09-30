import { RedirectThemeVariations } from '@agent/components/redirects/RedirectThemeVariations';
import { SelectThemeVariation } from '@agent/workflows/theme/components/SelectThemeVariation';
import { __ } from '@wordpress/i18n';
import { color } from '@wordpress/icons';

const { context, abilities } = window.extAgentData;

export default {
	available: () => abilities?.canEditThemes && context?.hasThemeVariations,
	needsRedirect: () => !Number(context?.postId || 0),
	redirectComponent: RedirectThemeVariations,
	id: 'change-theme-variation',
	whenFinished: {
		component: SelectThemeVariation,
	},
	example: {
		// translators: "theme colors" refers to the color palette variation for the current theme.
		text: __('Change website colors', 'extendify-local'),
		agentResponse: {
			// translators: This message show above a UI where the user can select a different color variation for their theme.
			reply: __(
				'Below you can select a different color variation for your theme.',
				'extendify-local',
			),
			whenFinishedTool: {
				id: 'update-theme-variation',
				labels: {
					confirm: __('Updated the theme color', 'extendify-local'),
					cancel: __('Canceled the theme color update', 'extendify-local'),
				},
			},
		},
	},
	icon: color,
};
