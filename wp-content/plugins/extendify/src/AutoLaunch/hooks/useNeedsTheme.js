import { launchStrings } from '@auto-launch/strings';

export const useNeedsTheme = () => {
	const strings = launchStrings();

	return {
		title: strings.needsThemeTitle,
		body: strings.needsThemeBody,
		action: {
			label: strings.needsThemeAction,
			href: `${window.extSharedData.adminUrl}theme-install.php?theme=extendable`,
		},
	};
};
