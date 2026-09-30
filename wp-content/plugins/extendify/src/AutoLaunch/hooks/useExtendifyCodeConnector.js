import { buildExtendifyCodeLink } from '@auto-launch/functions/extendify-code';
import { checkIn } from '@auto-launch/functions/insights';
import { useLaunchDataStore } from '@auto-launch/state/launch-data';
import { launchStrings } from '@auto-launch/strings';
import { useEffect } from '@wordpress/element';
import { arrowRight, code, external, layout } from '@wordpress/icons';

export const useExtendifyCodeConnector = ({ onProceed }) => {
	const { descriptionRaw, title } = useLaunchDataStore();
	const strings = launchStrings();
	const { extendifyCodeData = {} } = window.extSharedData;
	const { link, title: codeTitle, message, ctaPrimary } = extendifyCodeData;
	const ready = Boolean(link && codeTitle && message && ctaPrimary);

	useEffect(() => {
		if (!ready) {
			onProceed();
			return;
		}
		checkIn({
			stage: 'extendify_code_screen_seen',
			description: descriptionRaw || title,
		});
	}, [ready, onProceed, descriptionRaw, title]);

	// A partial partner payload must not trap the flow on a blank screen.
	if (!ready) return { options: [] };

	return {
		title: strings.connectorTitle,
		subtitle: strings.connectorBody,
		options: [
			{
				key: 'wordpress',
				icon: layout,
				heading: strings.wordpressHeading,
				description: strings.wordpressBody,
				buttonLabel: strings.wordpressAction,
				buttonIcon: arrowRight,
				onClick: () => {
					checkIn({ stage: 'extendify_code_choose_wordpress' });
					onProceed();
				},
			},
			{
				key: 'builder',
				icon: code,
				highlight: true,
				badgeLabel: strings.connectorBadge,
				heading: codeTitle,
				description: message,
				buttonLabel: ctaPrimary,
				buttonIcon: external,
				onClick: () => {
					const url = buildExtendifyCodeLink(link, {
						description: descriptionRaw,
						title,
					});
					checkIn({ stage: 'extendify_code_choose_builder' });
					if (url) window.location.assign(url);
				},
			},
		],
	};
};
