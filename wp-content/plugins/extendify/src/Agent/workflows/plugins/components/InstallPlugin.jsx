import { recordPluginActivity } from '@shared/api/DataApi';
import { activatePlugin, installPlugin } from '@shared/api/wp';
import { useEffect, useState } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import { external, Icon } from '@wordpress/icons';

export const InstallPlugin = ({ inputs, onConfirm, onCancel }) => {
	const [status, setStatus] = useState('idle');
	const handleConfirm = () => {
		setStatus('installing');
	};

	useEffect(() => {
		if (!inputs.alreadyInstalled) return;
		const id = requestAnimationFrame(() => {
			onCancel?.();
		});
		return () => cancelAnimationFrame(id);
	}, [inputs, onCancel]);

	useEffect(() => {
		let cancelled = false;

		const run = async () => {
			if (status === 'installing') {
				try {
					await installPlugin(inputs.pluginSlug);
					if (cancelled) return;
					setStatus('activating');
				} catch (error) {
					if (cancelled) return;
					if (error?.code === 'folder_exists') {
						setStatus('activating');
						return;
					}
					setStatus('error');
				}
				return;
			}

			if (status === 'activating') {
				try {
					await activatePlugin(inputs.pluginSlug);
				} catch {
					try {
						await new Promise((r) => setTimeout(r, 500));
						await activatePlugin(inputs.pluginSlug);
					} catch {
						if (!cancelled) setStatus('error');
						return;
					}
				}
				if (cancelled) return;

				try {
					await recordPluginActivity({
						slug: inputs.pluginSlug,
						source: 'ai-agent-recommendation',
					});
					await adminLoader();

					if (!cancelled) onConfirm({ shouldRefreshPage: true });
				} catch {
					if (!cancelled) setStatus('error');
				}
			}
		};
		run();
		return () => {
			cancelled = true;
		};
	}, [status, onConfirm, inputs]);

	if (status === 'error') {
		return (
			<Wrapper>
				<Content>
					<p className="m-0 p-0 text-sm text-gray-900">
						{__(
							'There was an error installing the plugin. You may try again',
							'extendify-local',
						)}
					</p>
				</Content>
				<div className="flex justify-start gap-2 p-3">
					<CancelButton onClick={onCancel} />
					<ConfirmButton
						onClick={handleConfirm}
						text={__('Try Again', 'extendify-local')}
					/>
				</div>
			</Wrapper>
		);
	}

	if (['installing', 'activating'].includes(status)) {
		return (
			<Wrapper>
				<Content>
					<p className="m-0 p-0 text-sm text-gray-900">
						{status === 'installing'
							? __('Installing plugin...', 'extendify-local')
							: __('Activating plugin...', 'extendify-local')}
					</p>
				</Content>
			</Wrapper>
		);
	}

	return (
		<Wrapper>
			<Content>
				<div className="flex flex-col gap-3">
					<p className="m-0 p-0 text-sm text-gray-900">
						{__(
							'The agent is requesting to install and activate a plugin.',
							'extendify-local',
						)}
					</p>
					<div className="flex-col gap-1">
						{inputs.pluginName && (
							<div className="flex-1 font-bold">{inputs.pluginName}</div>
						)}
						<a
							className="text-xs flex flex-1 items-end text-gray-900 hover:text-gray-900 hover:decoration-solid"
							href={`https://wordpress.org/plugins/${inputs.pluginSlug}`}
							target="_blank"
							rel="noopener noreferrer"
						>
							<span
								dangerouslySetInnerHTML={{
									__html: sprintf(
										// translators: %1$s and %2$s are HTML tags. %1$s opens a span with screen-reader-only text, and %2$s closes that span.
										__(
											'Plugin Details %1$s(opens in a new tab)%2$s',
											'extendify-local',
										),
										'<span class="sr-only">',
										'</span>',
									),
								}}
							/>
							<Icon className="ml-1 inline-block" icon={external} size={18} />
						</a>
					</div>
				</div>
			</Content>
			<div className="flex justify-start gap-2 p-3">
				<CancelButton onClick={onCancel} />
				<ConfirmButton
					onClick={handleConfirm}
					text={__('Install Plugin', 'extendify-local')}
				/>
			</div>
		</Wrapper>
	);
};

const CancelButton = ({ onClick }) => (
	<button
		type="button"
		className="w-full rounded-sm border border-gray-500 bg-white p-2 text-sm text-gray-900"
		onClick={onClick}
	>
		{__('Cancel', 'extendify-local')}
	</button>
);

const ConfirmButton = ({ onClick, text }) => (
	<button
		type="button"
		className="w-full rounded-sm border border-design-main bg-design-main p-2 text-sm text-white"
		onClick={onClick}
	>
		{text}
	</button>
);

const Wrapper = ({ children }) => (
	<div className="mb-4 ms-2 me-2 flex flex-col rounded-lg border border-gray-300 bg-gray-50">
		{children}
	</div>
);

const Content = ({ children }) => (
	<div className="rounded-lg border-b border-gray-300 bg-white">
		<div className="p-3">{children}</div>
	</div>
);

const adminLoader = () => {
	return new Promise((resolve) => {
		const { adminUrl } = window.extSharedData;
		const iframe = Object.assign(document.createElement('iframe'), {
			title: 'Admin Loader',
			src: adminUrl,
			style: 'display: none;',
			sandbox: 'allow-same-origin allow-scripts allow-forms',
			onload: () => {
				document.body.removeChild(iframe);
				resolve();
			},
		});
		document.body.appendChild(iframe);
	});
};
