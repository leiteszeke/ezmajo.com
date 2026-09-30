import { checkIn } from '@auto-launch/functions/insights';
import { sparkles } from '@auto-launch/icons';
import { launchStrings } from '@auto-launch/strings';
import { useEffect } from '@wordpress/element';
import { cloudUpload } from '@wordpress/icons';

const migrateSearchUrl = (search) =>
	`${window.extSharedData.adminUrl}plugin-install.php?tab=search&s=${encodeURIComponent(search)}`;

export const useMigrateChoice = ({ onBuildNew }) => {
	const strings = launchStrings();

	useEffect(() => {
		checkIn({ stage: 'migrate_screen' });
	}, []);

	return {
		title: strings.migrateTitle,
		options: [
			{
				key: 'migrate',
				icon: cloudUpload,
				heading: strings.migrateHeading,
				buttonLabel: strings.migrateAction,
				description: strings.migrateBody,
				onClick: () => {
					checkIn({ stage: 'migrate_screen_migrate' });
					window.location.assign(migrateSearchUrl(strings.migrationSearch));
				},
			},
			{
				key: 'build',
				icon: sparkles,
				heading: strings.buildHeading,
				highlight: true,
				badgeLabel: strings.buildBadge,
				buttonLabel: strings.buildAction,
				description: strings.buildBody,
				onClick: () => {
					checkIn({ stage: 'migrate_screen_build' });
					onBuildNew();
				},
			},
		],
	};
};
