import {
	Description,
	DialogTitle,
	Field,
	Input,
	Label,
} from '@headlessui/react';
import { __, _n } from '@wordpress/i18n';
import { check, chevronRight, external, Icon } from '@wordpress/icons';
import { isEmail } from '@wordpress/url';
import classNames from 'classnames';

export const SetupPlugins = ({
	plugins,
	setPlugins,
	handleCreateAccounts,
	email,
	setEmail,
	handleClose,
	marketingConsent,
	setMarketingConsent,
	termsAgreed,
	setTermsAgreed,
}) => {
	const offeredCount = plugins.length;
	const isCreateAccountsEnabled =
		isEmail(email) && termsAgreed && plugins?.some((plugin) => plugin.selected);

	const togglePlugin = (pluginTitle) => {
		setPlugins(
			plugins?.map((plugin) => {
				if (plugin.title !== pluginTitle) {
					return plugin;
				}

				return {
					...plugin,
					selected: !plugin?.selected,
				};
			}),
		);
	};

	return (
		<div className="py-10 px-16">
			<DialogTitle className="text-2xl font-semibold text-center text-gray-900 mb-10 font-sans">
				{_n(
					"Almost done! Let's finish setting up your plugin",
					"Almost done! Let's finish setting up your plugins",
					offeredCount,
					'extendify-local',
				)}
			</DialogTitle>

			<div className="space-y-3 mb-8">
				{plugins?.map((plugin) => {
					const isSelected = plugin.selected;
					return (
						<div
							key={plugin.title}
							className={classNames(
								'w-full flex items-center gap-4 p-4 rounded-lg border-2 text-left transition-colors',
								isSelected
									? 'border-[#1A5130] bg-[#1A5130]/5'
									: 'border-gray-300 bg-white hover:border-gray-400',
							)}
						>
							<div className="shrink-0 self-baseline">
								<img
									alt=""
									src={plugin.image}
									className="w-8 h-8 rounded-full"
								/>
							</div>
							<div className="flex-1 min-w-0">
								<div className="font-semibold text-gray-900 mb-1">
									{plugin.title}
								</div>
								<div className="text-sm text-gray-700">
									{plugin.description}{' '}
									{plugin.termOfServiceLink && (
										<a
											href={plugin.termOfServiceLink}
											onClick={(e) => e.stopPropagation()}
											target="_blank"
											rel="noopener noreferrer"
											className="text-gray-900 underline hover:underline"
										>
											{__('Term of Service', 'extendify-local')}
											<Icon
												icon={external}
												size={18}
												className="ml-0.5 inline"
											/>
										</a>
									)}
								</div>
							</div>
							<Icon
								icon={check}
								onClick={() => togglePlugin(plugin.title)}
								className={classNames(
									'shrink-0 rounded-full transition-colors cursor-pointer',
									isSelected
										? 'bg-[#1A5130] fill-white'
										: 'bg-gray-200 fill-transparent',
								)}
							/>
						</div>
					);
				})}
			</div>

			<Field className="mb-8">
				<Label className="block text-sm font-medium text-gray-900 mb-2">
					{__('Email address', 'extendify-local')}
				</Label>
				<Input
					required
					type="email"
					value={email}
					onChange={(e) => setEmail(e.target.value)}
					placeholder="admin@example.com"
					className="text-gray-900 w-full px-4 py-3 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-extendify-main focus:border-transparent"
				/>
				<Description className="mt-2 text-xss text-gray-700">
					{_n(
						'This email will be used to create an account with the selected plugin provider. Form protected by reCAPTCHA.',
						'This email will be used to create accounts with the selected plugin providers. Form protected by reCAPTCHA.',
						offeredCount,
						'extendify-local',
					)}
				</Description>
			</Field>

			<label className="flex items-start gap-3 mb-4 cursor-pointer">
				<input
					type="checkbox"
					checked={termsAgreed}
					onChange={(e) => setTermsAgreed(e.target.checked)}
					className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 accent-extendify-main focus:ring-extendify-main"
				/>
				<span className="text-xs/relaxed text-gray-700">
					{_n(
						'I agree to create an account with the selected provider using my email address, and to their applicable Terms of Service.',
						'I agree to create accounts with the selected providers using my email address, and to their applicable Terms of Service.',
						offeredCount,
						'extendify-local',
					)}
				</span>
			</label>

			<label className="flex items-start gap-3 mb-8 cursor-pointer">
				<input
					type="checkbox"
					checked={marketingConsent}
					onChange={(e) => setMarketingConsent(e.target.checked)}
					className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 accent-extendify-main focus:ring-extendify-main"
				/>
				<span className="text-xs/relaxed text-gray-700">
					{_n(
						'I wish to receive communications about news and/or promotions from the selected provider.',
						'I wish to receive communications about news and/or promotions from selected providers.',
						offeredCount,
						'extendify-local',
					)}
				</span>
			</label>

			<div className="flex items-center gap-4">
				<button
					type="button"
					onClick={() => handleClose()}
					className="px-6 py-3 text-base font-medium text-gray-900 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-extendify-main"
				>
					{__('No thanks', 'extendify-local')}
				</button>
				<button
					type="button"
					onClick={handleCreateAccounts}
					disabled={!isCreateAccountsEnabled}
					className={classNames(
						'ml-auto px-6 py-3 text-base font-medium text-white bg-extendify-main rounded-lg hover:bg-extendify-main-dark focus:outline-none focus:ring-2 focus:ring-extendify-main focus:ring-offset-2 flex items-center gap-2',
						{ 'cursor-not-allowed opacity-50': !isCreateAccountsEnabled },
					)}
				>
					{_n(
						'Create account',
						'Create accounts',
						offeredCount,
						'extendify-local',
					)}
					<Icon size={22} icon={chevronRight} className="fill-white" />
				</button>
			</div>
		</div>
	);
};
