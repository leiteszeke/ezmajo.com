import { Logo } from '@auto-launch/components/Logo';
import { LoaderGraphic, StatusMessage } from '@auto-launch/components/Progress';
import { WaitingOverlay } from '@auto-launch/components/Waiting';
import { activeLogo, designRoot } from '@auto-launch/functions/design';
import { useCreateSite } from '@auto-launch/hooks/useCreateSite';
import { useRateLimitedCursor } from '@auto-launch/hooks/useRateLimitedCursor';
import {
	clearPersistedLaunchData,
	useLaunchDataStore,
} from '@auto-launch/state/launch-data';
import { launchStrings } from '@auto-launch/strings';
import { activeProgressTemplate } from '@auto-launch/templates';
import { useEffect, useRef, useState } from '@wordpress/element';
import { Icon, info } from '@wordpress/icons';

const loaderImage = () => {
	const root = designRoot();
	if (!root) return '';

	return getComputedStyle(root)
		.getPropertyValue('--ext-ui-loader-image')
		.trim()
		.replace(/^url\(["']?|["']?\)$/g, '');
};

export const CreatingSite = () => {
	const { done } = useCreateSite();
	const { partnerLogo, partnerName } = window.extSharedData ?? {};
	const pos = useRef(0);
	const [currentMessage, setCurrentMessage] = useState(null);
	const [loadAdmin, setLoadAdmin] = useState(false);
	const {
		statusMessages,
		errorMessage,
		setErrorMessage,
		errorCount,
		needToStall,
		resetErrorCount,
	} = useLaunchDataStore();
	const Page = activeProgressTemplate();

	useRateLimitedCursor(
		() => {
			if (errorMessage) return false;
			if (pos.current >= statusMessages.length) return false;

			const remaining = statusMessages.length - pos.current;
			const MAX_BACKLOG = 3;

			// Skip ahead silently if backed up
			if (remaining > MAX_BACKLOG && pos.current > 0) {
				pos.current = statusMessages.length - MAX_BACKLOG;
			}

			setCurrentMessage(statusMessages[pos.current]);
			pos.current += 1;

			return pos.current < statusMessages.length;
		},
		// Variable timer to feel more natural, 2.5-3.25s
		Math.floor(2500 + Math.random() * 750),
		[statusMessages.length],
	);

	useEffect(() => {
		if (!errorMessage) return;
		const timeout = setTimeout(() => {
			// Clear after 5 seconds
			setErrorMessage(null);
		}, 5000);
		return () => clearTimeout(timeout);
	}, [errorMessage, setErrorMessage]);

	useEffect(() => {
		if (!done) return;
		setLoadAdmin(true);
		const timeout = setTimeout(() => {
			clearPersistedLaunchData();
			window.location.replace(
				`${window.extSharedData.homeUrl}?extendify-launch-success=1`,
			);
		}, 3000);
		return () => clearTimeout(timeout);
	}, [done]);

	useEffect(() => {
		if (!needToStall()) return;
		const timer = setTimeout(() => {
			resetErrorCount();
		}, 10000); // reset after 10 seconds
		return () => clearTimeout(timer);
	}, [needToStall, errorCount, resetErrorCount]);

	const stalling = needToStall();

	return (
		<>
			<Page
				parts={{
					logo: <Logo name={partnerName} src={activeLogo() ?? partnerLogo} />,
					graphic: <LoaderGraphic src={loaderImage()} />,
					status: <StatusMessage message={currentMessage} />,
				}}
				has={{ card: true }}
			/>
			<WaitingOverlay
				show={stalling}
				icon={<Icon icon={info} size={32} />}
				message={launchStrings().stalled}
				note={launchStrings().stalledNote}
			/>
			<WaitingOverlay
				show={!stalling && Boolean(errorMessage)}
				icon={<Icon icon={info} size={32} />}
				message={errorMessage}
			/>
			{loadAdmin ? <AdminLoader /> : null}
		</>
	);
};

// iframe that loads the admin in the background to make sure
// all php functions that require admin context work properly.
const AdminLoader = () => (
	<iframe
		title="Admin Loader"
		src={window.extSharedData.adminUrl}
		style={{ display: 'none' }}
		sandbox="allow-same-origin allow-scripts allow-forms"
	/>
);
