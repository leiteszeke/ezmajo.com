import { Dialog, DialogBackdrop, DialogPanel } from '@headlessui/react';
import { prewarmRecaptcha } from '@shared/api/pluginsActivation';
import { useEffect, useState } from '@wordpress/element';
import { isEmail } from '@wordpress/url';
import { accountContext } from './accountContext';
import { createAccount } from './createAccount';
import { partitionPlugins } from './partitionPlugins';
import { SetupComplete } from './SetupComplete';
import { SetupPlugins } from './SetupPlugins';
import {
	ACCOUNT_STATUS,
	ACTIVATION_STATUS,
	usePluginsActivation,
} from './usePluginsActivation';

export const ProductAccountActivation = () => {
	const [isOpen, setIsOpen] = useState(true);
	const [submitted, setSubmitted] = useState(null);
	const { offered, ineligible } = partitionPlugins(
		window.extSharedData?.showProductActivation,
	);
	const [plugins, setPlugins] = useState(offered);

	const [email, setEmail] = useState(window.extSharedData?.userEmail ?? '');
	const [marketingConsent, setMarketingConsent] = useState(false);
	const [termsAgreed, setTermsAgreed] = useState(false);
	const { scriptData, activatePlugins } = usePluginsActivation(
		plugins,
		ineligible,
	);

	useEffect(() => {
		const style = document.createElement('style');
		style.textContent = '.grecaptcha-badge { visibility: hidden; }';
		document.head.appendChild(style);
	}, []);

	useEffect(() => {
		// Site keys come from PHP, so the prewarm needs no SWR wait.
		for (const plugin of offered) {
			const siteKey = plugin.scriptData?.recaptchaSiteKey;
			if (siteKey) prewarmRecaptcha(siteKey).catch(() => {});
		}
	}, []);

	const handleClose = () => {
		activatePlugins({
			status: ACTIVATION_STATUS.skipped,
		});
		setIsOpen(false);
	};

	const trackStatus = (slug, request) => {
		const record = (status) =>
			setSubmitted((current) =>
				current.map((plugin) =>
					plugin.slug === slug ? { ...plugin, status } : plugin,
				),
			);

		request.then(
			() => record(ACCOUNT_STATUS.success),
			() => record(ACCOUNT_STATUS.error),
		);

		return request;
	};

	const handleCreateAccounts = async () => {
		if (!isEmail(email)) return;

		const selectedPlugins = plugins.filter((plugin) => plugin.selected);

		setSubmitted(
			selectedPlugins.map((plugin) => ({
				...plugin,
				status: ACCOUNT_STATUS.pending,
			})),
		);

		const settling = Promise.allSettled(
			selectedPlugins.map((plugin) =>
				trackStatus(
					plugin.slug,
					createAccount(plugin, {
						email,
						marketingConsent,
						termsAgreed,
						scriptData: { ...scriptData?.[plugin.slug], ...plugin.scriptData },
					}),
				),
			),
		);

		// A record stuck on pending is a user who left before the answer.
		await activatePlugins({
			status: ACTIVATION_STATUS.completed,
			context: accountContext(selectedPlugins),
		});

		const results = await settling;

		await activatePlugins({
			status: ACTIVATION_STATUS.completed,
			context: accountContext(selectedPlugins, results),
		});
	};

	return (
		plugins.length > 0 && (
			<Dialog open={isOpen} onClose={() => {}} className="extendify-shared">
				{/* Utilities on the scope-class element itself never match the prefixed CSS. */}
				<div className="relative z-high">
					<DialogBackdrop
						transition
						className="fixed inset-0 bg-black/30 transition-opacity data-closed:opacity-0"
					/>

					<div className="z-10 fixed top-0 left-0 right-0 bottom-(--extendify-notification-bar-height,0px) flex items-center justify-center p-4 [body:has(#extendify-agent-chat)_&]:ml-96 [body:has(#extendify-agent-chat)_&]:w-[calc(100%-24rem)]">
						<DialogPanel
							transition
							className="relative w-full max-w-208 max-h-full overflow-hidden flex flex-col bg-white rounded-lg shadow-xl transition-all data-closed:opacity-0 data-closed:scale-95"
						>
							<div className="overflow-y-auto">
								{submitted ? (
									<SetupComplete
										plugins={submitted}
										handleClose={() => setIsOpen(false)}
									/>
								) : (
									<SetupPlugins
										plugins={plugins}
										setPlugins={setPlugins}
										handleCreateAccounts={handleCreateAccounts}
										email={email}
										setEmail={setEmail}
										handleClose={handleClose}
										marketingConsent={marketingConsent}
										setMarketingConsent={setMarketingConsent}
										termsAgreed={termsAgreed}
										setTermsAgreed={setTermsAgreed}
									/>
								)}
							</div>
						</DialogPanel>
					</div>
				</div>
			</Dialog>
		)
	);
};
