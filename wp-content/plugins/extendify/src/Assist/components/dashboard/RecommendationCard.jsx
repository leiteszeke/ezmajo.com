import { recordPluginActivity } from '@shared/api/DataApi';
import { activatePlugin, installPlugin } from '@shared/api/wp';
import { useActivityStore } from '@shared/state/activity';
import { Button } from '@wordpress/components';
import { useEffect, useState } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import { caution, check, Icon } from '@wordpress/icons';

export const RecommendationCard = ({ recommendation }) => {
	if (recommendation.pluginSlug) {
		return <InstallCard recommendation={recommendation} />;
	}
	return <LinkCard recommendation={recommendation} />;
};

const LinkCard = ({ recommendation }) => {
	const { by, slug, description, image, title, linkType } = recommendation;
	const { incrementActivity } = useActivityStore();
	if (!recommendation?.[linkType]) return null;

	return (
		<a
			href={recommendation[linkType]?.replace(
				'{APEXDOMAIN}',
				window.extSharedData?.apexDomain ?? '',
			)}
			onClick={() => incrementActivity(`recommendations-${slug}`)}
			target="_blank"
			className="cursor-pointer rounded-sm border border-gray-200 bg-transparent p-4 text-left text-base no-underline hover:border-design-main hover:bg-gray-50 rtl:text-right"
		>
			<div className="h-full w-full">
				<img
					className="h-8 w-8 rounded-sm fill-current"
					alt={
						by
							? /* translators: %s: The name of the company/author */
								sprintf(__('Logo for %s', 'extendify-local'), by)
							: undefined
					}
					src={image}
				/>
				<div className="mt-2 font-semibold">{title}</div>
				{by && <div className="text-sm text-gray-700">{by}</div>}
				<div className="mt-2 text-sm text-gray-800">{description}</div>
			</div>
		</a>
	);
};

const InstallCard = ({ recommendation }) => {
	const { by, slug, description, image, title, pluginSlug } = recommendation;
	const { incrementActivity } = useActivityStore();
	return (
		// biome-ignore lint: keep button
		<div
			role="button"
			tabIndex={0}
			onClick={() => incrementActivity(`recommendations-install-${slug}`)}
			onKeyDown={(e) => {
				if (!(e.key === 'Enter' || e.key === ' ')) return;
				incrementActivity(`recommendations-install-${slug}`);
			}}
			className="rounded-sm border border-gray-200 bg-transparent p-4 text-left text-base rtl:text-right"
		>
			<div className="h-full w-full">
				<img
					className="h-8 w-8 rounded-sm fill-current"
					alt={
						by ? sprintf(__('Logo for %s', 'extendify-local'), by) : undefined
					}
					src={image}
				/>
				<div className="mt-2 font-semibold">{title}</div>
				{by && <div className="text-sm text-gray-700">{by}</div>}
				<div className="mb-3 mt-2 text-sm text-gray-800">{description}</div>
				<InstallButton slug={pluginSlug} />
			</div>
		</div>
	);
};

const InstallButton = ({ slug }) => {
	const [installing, setInstalling] = useState(false);
	const [status, setStatus] = useState('');

	useEffect(() => {
		const { installedPlugins, activePlugins } = window.extSharedData;
		const hasPlugin = (p) => p?.includes(slug);
		const installed = Object.values(installedPlugins).some(hasPlugin);
		const active = Object.values(activePlugins).some(hasPlugin);
		if (installed) setStatus('inactive');
		if (active) setStatus('active');
	}, [slug, setStatus]);

	const handleClick = async () => {
		setInstalling(true);
		try {
			await installPlugin(slug);
			recordPluginActivity({
				slug,
				source: 'assist-recommendation-card',
			});
		} catch (_) {
			// Fail silently if the plugin is already installed
			console.error('Error installing plugin:', _);
		}
		try {
			await activatePlugin(slug);
			setStatus('active');
		} catch (_) {
			setStatus('error');
			setTimeout(() => {
				setStatus(status);
			}, 1500);
		}
		setInstalling(false);
	};

	if (status === 'error') {
		return (
			<p
				className="flex items-center fill-wp-alert-red text-wp-alert-red"
				style={{ fontSize: '13px' }}
			>
				<Icon icon={caution} />
				{__('Error', 'extendify-local')}
			</p>
		);
	}

	if (status === 'active') {
		return (
			<p
				className="flex items-center fill-wp-alert-green text-wp-alert-green"
				style={{ fontSize: '13px' }}
			>
				<Icon icon={check} />
				{__('Active', 'extendify-local')}
			</p>
		);
	}

	if (status === 'inactive') {
		return (
			<Button
				onClick={handleClick}
				type="button"
				variant="secondary"
				size="compact"
				disabled={installing}
				isBusy={installing}
			>
				{installing
					? __('Activating...', 'extendify-local')
					: __('Activate', 'extendify-local')}
			</Button>
		);
	}

	return (
		<Button
			onClick={handleClick}
			type="button"
			variant="secondary"
			size="compact"
			disabled={installing}
			isBusy={installing}
		>
			{installing
				? __('Installing...', 'extendify-local')
				: __('Install Now', 'extendify-local')}
		</Button>
	);
};
