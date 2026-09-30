import { WaitingOverlay } from '@auto-launch/components/Waiting';
import { forceReinstallPlugin, runUpdates } from '@auto-launch/functions/setup';
import { launchStrings } from '@auto-launch/strings';
import { digest } from '@shared/api/digest';
import { useCallback, useEffect } from '@wordpress/element';

// The reload is also the retry; the server bounds how many, so it can't loop.
export const LaunchUpdate = ({
	pluginUpdateNeeded,
	themeUpdateNeeded,
	pluginUpdateViaRest,
	pluginSlug,
	attempt,
}) => {
	const applyUpdates = useCallback(async () => {
		// Run serially, not concurrently: two WP upgraders fight over the shared
		// maintenance flag and filesystem.
		const phpUpdateNeeded =
			themeUpdateNeeded || (pluginUpdateNeeded && !pluginUpdateViaRest);
		try {
			if (phpUpdateNeeded) {
				const result = await runUpdates();
				if (result?.errors?.length) {
					throw new Error(result.errors.join('; '));
				}
			}
			if (pluginUpdateNeeded && pluginUpdateViaRest) {
				await forceReinstallPlugin(pluginSlug);
			}
		} catch (error) {
			digest({
				error,
				details: { source: 'auto-launch', caller: 'launch-update', attempt },
			});
		} finally {
			window.location.reload();
		}
	}, [
		pluginUpdateNeeded,
		themeUpdateNeeded,
		pluginUpdateViaRest,
		pluginSlug,
		attempt,
	]);

	useEffect(() => {
		applyUpdates();
	}, [applyUpdates]);

	const strings = launchStrings();

	return (
		<WaitingOverlay
			show
			message={strings.updating}
			note={strings.updatingNote}
		/>
	);
};
