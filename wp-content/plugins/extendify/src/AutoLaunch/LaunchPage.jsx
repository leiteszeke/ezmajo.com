import { CreatingSite } from '@auto-launch/components/CreatingSite';
import { DescriptionGathering } from '@auto-launch/components/DescriptionGathering';
import { LaunchUpdate } from '@auto-launch/components/LaunchUpdate';
import { Logo } from '@auto-launch/components/Logo';
import {
	ModalHeading,
	ModalLink,
	ModalText,
} from '@auto-launch/components/Modal';
import { ShaderBackground } from '@auto-launch/components/ShaderBackground';
import { activeLogo } from '@auto-launch/functions/design';
import { getAbTest } from '@auto-launch/functions/getAbTest';
import { preLaunchFunctions } from '@auto-launch/functions/setup';
import { updateOption } from '@auto-launch/functions/wp';
import { useExtendifyCodeConnector } from '@auto-launch/hooks/useExtendifyCodeConnector';
import { useInstallRequiredPlugins } from '@auto-launch/hooks/useInstallRequiredPlugins';
import { useMigrateChoice } from '@auto-launch/hooks/useMigrateChoice';
import { useNeedsTheme } from '@auto-launch/hooks/useNeedsTheme';
import { useRestartLaunch } from '@auto-launch/hooks/useRestartLaunch';
import { useLaunchDataStore } from '@auto-launch/state/launch-data';
import { launchStrings } from '@auto-launch/strings';
import {
	activeChoiceTemplate,
	activeDescriptionTemplate,
	activeModalTemplate,
} from '@auto-launch/templates';
import { ActionButton, SecondaryButton } from '@auto-launch/templates/button';
import { Heading, PageLink } from '@auto-launch/templates/heading';
import { digest } from '@shared/api/digest';
import { registerCoreBlocks } from '@wordpress/block-library';
import { getBlockTypes } from '@wordpress/blocks';
import { useSelect } from '@wordpress/data';
import { useEffect, useState } from '@wordpress/element';
import classNames from 'classnames';
import { AnimatePresence, motion } from 'framer-motion';
import { checkIn, reportRestApiStatus } from './functions/insights';

export const LaunchPage = () => {
	const theme = useSelect((select) => select('core').getCurrentTheme());
	// Checking `theme` here makes sure the data is populated
	const needsTheme = theme && theme?.textdomain !== 'extendable';

	const oldPages = window.extLaunchData.resetSiteInformation.pagesIds ?? [];
	const needsToReset = oldPages.length > 0;

	const pluginUpdateNeeded = Boolean(window.extLaunchData?.pluginUpdateNeeded);
	const themeUpdateNeeded = Boolean(window.extLaunchData?.themeUpdateNeeded);
	const pluginUpdateViaRest = Boolean(
		window.extLaunchData?.pluginUpdateViaRest,
	);
	const launchUpdateNeeded = pluginUpdateNeeded || themeUpdateNeeded;
	const launchUpdateAttempt = window.extLaunchData?.launchUpdateAttempt ?? 0;
	const launchUpdateStale = window.extLaunchData?.launchUpdateStale ?? {};
	const launchUpdateGaveUp = Object.keys(launchUpdateStale).length > 0;

	const {
		title,
		descriptionRaw,
		go,
		urlParams,
		designBuild,
		setData,
		showExtendifyCodeScreen,
	} = useLaunchDataStore();
	const skipDescription =
		Boolean(urlParams?.['build-id']) ||
		designBuild ||
		((title || descriptionRaw) && go);
	const showConnector = !skipDescription && showExtendifyCodeScreen;
	const showExitLink =
		!skipDescription && !window.extLaunchData?.hideAutoLaunchExitLink;
	const inMigrateVariant =
		getAbTest('AutoLaunch.MigrateScreen').variant === 'B';
	const [choosingMigration, setChoosingMigration] = useState(inMigrateVariant);
	const showMigrateChoice = !skipDescription && choosingMigration;

	// Deleting the old pages first leaves the user on a theme Launch cannot build on.
	const blocker = launchUpdateNeeded
		? 'update'
		: needsTheme
			? 'theme'
			: needsToReset
				? 'reset'
				: null;

	// Only the describe screen commits to a build; every other screen can still leave.
	useInstallRequiredPlugins({
		enabled:
			!blocker && !skipDescription && !showConnector && !showMigrateChoice,
	});

	useEffect(() => {
		if (launchUpdateNeeded) return;
		if (launchUpdateGaveUp) {
			digest({
				error: new Error('Launch went ahead without the pending update'),
				details: {
					source: 'auto-launch',
					caller: 'launch-update',
					stale: launchUpdateStale,
				},
			});
		}
		// translators: Launch is a noun.
		document.title = launchStrings().documentTitle;
		updateOption('extendify_launch_loaded', new Date().toISOString());
		// We load core blocks so we can parse them
		if (getBlockTypes().length === 0) registerCoreBlocks();

		preLaunchFunctions();
		checkIn({ stage: 'launch_page' });
		reportRestApiStatus();
	}, [launchUpdateNeeded, launchUpdateGaveUp]);

	const modal =
		blocker === 'update' ? (
			<UpdateScreen
				pluginUpdateNeeded={pluginUpdateNeeded}
				themeUpdateNeeded={themeUpdateNeeded}
				pluginUpdateViaRest={pluginUpdateViaRest}
				pluginSlug={window.extLaunchData?.pluginSlug}
				attempt={launchUpdateAttempt}
			/>
		) : blocker === 'theme' ? (
			<NeedsThemeScreen />
		) : blocker === 'reset' ? (
			<RestartScreen pages={oldPages} />
		) : null;
	// Site creation must not start behind a modal the user has not cleared.
	const screen = modal
		? 'description'
		: showConnector
			? 'connector'
			: showMigrateChoice
				? 'migrate'
				: skipDescription
					? 'creating'
					: 'description';

	return (
		<Viewport modal={modal} screen={screen}>
			{screen === 'creating' ? (
				<CreatingSite />
			) : screen === 'connector' ? (
				<ConnectorScreen
					onProceed={() => setData('go', true)}
					footer={
						<BackLink
							onClick={() => setData('showExtendifyCodeScreen', false)}
						/>
					}
				/>
			) : screen === 'migrate' ? (
				<MigrateScreen
					onBuildNew={() => setChoosingMigration(false)}
					footer={showExitLink ? <ExitLink /> : null}
				/>
			) : (
				<DescriptionPage
					heading={<TheTitle />}
					footer={showExitLink ? <ExitLink /> : null}
				>
					{/* Matches the migrate screen's height, so choosing Build does not jump. */}
					<div className={classNames({ 'md:h-72.75': inMigrateVariant })}>
						<div className="mx-auto w-full">
							<DescriptionGathering autoFocus={!modal} />
						</div>
					</div>
				</DescriptionPage>
			)}
		</Viewport>
	);
};

const NeedsThemeScreen = () => {
	const { title, body, action } = useNeedsTheme();
	return (
		<ModalPage
			heading={<ModalHeading title={title} />}
			body={<ModalText>{body}</ModalText>}
			actions={<ModalLink href={action.href} label={action.label} />}
		/>
	);
};

const UpdateScreen = (props) => <LaunchUpdate {...props} />;

const RestartScreen = ({ pages }) => {
	const { title, body, note, exit, confirm } = useRestartLaunch({ pages });
	return (
		<ModalPage
			left
			heading={<ModalHeading title={title} />}
			body={
				<>
					<ModalText>{body}</ModalText>
					<ModalText strong>{note}</ModalText>
				</>
			}
			actions={
				<>
					<SecondaryButton
						disabled={confirm.processing}
						label={exit.label}
						onClick={exit.onClick}
					/>
					<ActionButton {...confirm} />
				</>
			}
		/>
	);
};

const ConnectorScreen = ({ onProceed, footer }) => {
	const { title, subtitle, options } = useExtendifyCodeConnector({ onProceed });
	return (
		<ChoicePage
			heading={title && <Heading subtitle={subtitle} title={title} />}
			options={options}
			footer={footer}
		/>
	);
};

const MigrateScreen = ({ onBuildNew, footer }) => {
	const { title, options } = useMigrateChoice({ onBuildNew });
	return (
		<ChoicePage
			heading={<Heading title={title} />}
			options={options}
			footer={footer}
		/>
	);
};

const Viewport = ({ children, screen, modal }) => (
	// Inline inset: utilities are !important here and would win over it.
	<div
		style={{ zIndex: 99999 + 1, top: 0, right: 0, bottom: 0, left: 0 }}
		className="group fixed bg-ui-page"
	>
		<AnimatePresence mode="wait" initial={false}>
			<motion.div
				key={screen}
				className="absolute inset-0"
				// React 18 drops a boolean inert; only a string reaches the DOM.
				inert={modal ? '' : undefined}
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				exit={{ opacity: 0 }}
				transition={{ duration: 0.25 }}
			>
				{children}
			</motion.div>
		</AnimatePresence>
		{modal}
		<ShaderBackground />
	</div>
);

const DescriptionPage = ({ children, footer, heading }) => {
	const Page = activeDescriptionTemplate();
	const { partnerLogo, partnerName } = window.extSharedData ?? {};
	// A template cannot tell a heading that renders null from one that draws.
	const has = {
		heading: Boolean(heading),
		footer: Boolean(footer),
	};
	const parts = {
		logo: <Logo name={partnerName} src={activeLogo() ?? partnerLogo} />,
		heading,
		content: children,
		footer,
	};

	return <Page parts={parts} has={has} />;
};

const ModalPage = ({ heading, body, actions, left }) => {
	const Page = activeModalTemplate();
	const has = {
		heading: Boolean(heading),
		actions: Boolean(actions),
		card: true,
		left: Boolean(left),
	};

	return <Page parts={{ heading, body, actions }} has={has} />;
};

const ChoicePage = ({ heading, options, footer }) => {
	const Page = activeChoiceTemplate();
	const { partnerLogo, partnerName } = window.extSharedData ?? {};
	const has = {
		heading: Boolean(heading),
		footer: Boolean(footer),
	};
	const parts = {
		logo: <Logo name={partnerName} src={activeLogo() ?? partnerLogo} />,
		heading,
		options,
		footer,
	};

	return <Page parts={parts} has={has} />;
};

const ExitLink = () => (
	<PageLink
		href={window.extSharedData.adminUrl}
		label={launchStrings().exitLink}
		onClick={() => checkIn({ stage: 'exit_to_wp_admin' })}
	/>
);

const BackLink = ({ onClick }) => (
	<PageLink label={launchStrings().back} onClick={onClick} />
);

const TheTitle = () => <Heading title={launchStrings().heading} />;
