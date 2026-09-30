import { DialogTitle } from '@headlessui/react';
import { Spinner } from '@wordpress/components';
import { __, _n } from '@wordpress/i18n';
import { check, Icon } from '@wordpress/icons';
import { ACCOUNT_STATUS } from './usePluginsActivation';

const SuccessIcon = () => (
	<div className="p-2 rounded-full bg-[#4AB866]/25">
		<Icon
			icon={check}
			className="h-10 w-10 rounded-full bg-[#4AB866] fill-white"
		/>
	</div>
);

const isPending = (plugin) => plugin.status === ACCOUNT_STATUS.pending;

export const SetupComplete = ({ plugins, handleClose }) => {
	const isRunning = plugins.some(isPending);
	const accountCount = plugins.length;
	const heading = isRunning
		? _n(
				'Setting up your plugin account',
				'Setting up your plugin accounts',
				accountCount,
				'extendify-local',
			)
		: __('Setup complete', 'extendify-local');
	const body = isRunning
		? _n(
				'You can close this window. We will finish creating your account in the background.',
				'You can close this window. We will finish creating your accounts in the background.',
				accountCount,
				'extendify-local',
			)
		: _n(
				'Your plugin account has been set up. Account activation may take a moment to complete.',
				'Your plugin accounts have been set up. Account activation may take a moment to complete.',
				accountCount,
				'extendify-local',
			);

	return (
		<div className="px-16 py-10 flex flex-col items-center justify-center">
			<div className="mb-6">
				{isRunning ? (
					<Spinner className="h-10 w-10 text-[#1A5130]" />
				) : (
					<SuccessIcon />
				)}
			</div>
			<DialogTitle className="text-xl font-semibold text-center text-gray-900 mb-2 font-sans">
				{heading}
			</DialogTitle>
			<p className="text-center text-gray-700 mb-2 text-base">{body}</p>

			<div className="w-full mt-6 space-y-3">
				{plugins.map((plugin) => (
					<div
						key={plugin.slug}
						aria-busy={isPending(plugin)}
						className="flex items-center gap-3"
					>
						<img
							alt=""
							src={plugin.image}
							className="w-6 h-6 rounded-full shrink-0"
						/>
						<span className="text-sm text-gray-900">{plugin.title}</span>
						{isPending(plugin) ? (
							<Spinner className="ml-auto h-5 w-5 text-gray-700" />
						) : (
							<Icon
								icon={check}
								className="ml-auto shrink-0 rounded-full bg-[#1A5130] fill-white"
							/>
						)}
					</div>
				))}
			</div>

			<button
				type="button"
				onClick={handleClose}
				className="mt-6 px-6 py-3 text-base font-medium text-white bg-extendify-main rounded-lg hover:bg-extendify-main-dark focus:outline-none focus:ring-2 focus:ring-extendify-main focus:ring-offset-2"
			>
				{__('Close', 'extendify-local')}
			</button>
		</div>
	);
};
