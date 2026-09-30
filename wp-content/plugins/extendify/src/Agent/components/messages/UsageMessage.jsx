import { useGlobalStore } from '@agent/state/global';
import { humanTimeDiff } from '@wordpress/date';
import { useEffect, useState } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import { error, Icon } from '@wordpress/icons';

export const UsageMessage = ({ onReady }) => {
	const { retryAfter, isChatAvailable } = useGlobalStore();
	const [time, setTime] = useState(null);

	useEffect(() => {
		if (!retryAfter) return;
		const interval = setInterval(() => {
			if (isChatAvailable()) onReady();
			setTime(() =>
				humanTimeDiff(new Date(Number(retryAfter) + 45_000), new Date()),
			);
		}, 1000);
		return () => clearInterval(interval);
	}, [isChatAvailable, retryAfter, onReady]);

	if (!retryAfter || !time) return;
	return (
		<div className="flex gap-2 rounded-lg bg-gray-100 p-3 text-sm text-gray-900">
			<Icon icon={error} className="flex-none" />
			<div className="grow">
				<div>
					{sprintf(
						// translators: %s is a human-readable time difference, e.g. "2 hours from now"
						__(
							'You have reached your daily messages limit. Your limit will reset in %s.',
							'extendify-local',
						),
						time,
					)}
				</div>
			</div>
		</div>
	);
};
