import { recordActivity } from '@recommendations/utils/record-activity';
import { recordPluginActivity } from '@shared/api/DataApi';
import { activatePlugin, installPlugin } from '@shared/api/wp';
import { retryOperation, sleep } from '@shared/lib/utils';
import { Button } from '@wordpress/components';
import { useCallback, useEffect, useState } from '@wordpress/element';
import { decodeEntities } from '@wordpress/html-entities';
import { __, _x, sprintf } from '@wordpress/i18n';
import { caution, check, external, Icon } from '@wordpress/icons';

export const RecommendationCard = ({
	slug: product,
	title,
	description,
	ctaContent,
	provider,
	image,
	ctaType,
	ctaPluginSlug,
	ctaExternalLink,
	ctaInternalLink,
	priceTag,
}) => {
	useEffect(() => {
		recordActivity({ slot: 'plugin-search', event: 'view', product });
	}, [product]);

	return (
		<div
			className="flex flex-col rounded-sm border border-gray-300"
			data-test="extendify-recommendations-card"
		>
			<div className="row-auto grid grow grid-cols-[2fr_3fr] grid-rows-[min-content_1fr] gap-x-5 gap-y-3 p-5 xs:grid-cols-[8rem_1fr]">
				<div className="row-span-1 xs:row-span-2">
					{image &&
						(ctaType === 'plugin' ? (
							<a
								onClick={() =>
									recordActivity({
										slot: 'plugin-search',
										event: 'click-logo',
										product,
									})
								}
								// These WP classes (thickbox open-plugin-details-modal) are needed for the link to open in an iframe like WP does.
								className="thickbox open-plugin-details-modal block no-underline"
								// The hardcoded iframe dimensions are the default ones, but some WP magic makes them responsive.
								href={`${window.extSharedData?.adminUrl}/plugin-install.php?tab=plugin-information&plugin=${ctaPluginSlug}&TB_iframe=true&width=600&height=550`}
							>
								<img
									className="w-full xs:min-h-[8rem]"
									src={image}
									alt={title}
								/>
							</a>
						) : (
							<img className="w-full xs:min-h-[8rem]" src={image} alt={title} />
						))}
				</div>
				<div className="flex flex-col justify-center xs:justify-start">
					<h3 className="m-0 text-lg leading-tight text-wp-theme-main">
						{ctaType === 'plugin' ? (
							<a
								onClick={() =>
									recordActivity({
										slot: 'plugin-search',
										event: 'click-title',
										product,
									})
								}
								// These WP classes (thickbox open-plugin-details-modal) are needed for the link to open in an iframe like WP does.
								className="thickbox open-plugin-details-modal no-underline focus:shadow-none"
								// The hardcoded iframe dimensions are the default ones, but some WP magic makes them responsive.
								href={`${window.extSharedData?.adminUrl}/plugin-install.php?tab=plugin-information&plugin=${ctaPluginSlug}&TB_iframe=true&width=600&height=550`}
							>
								{decodeEntities(title)}
							</a>
						) : (
							decodeEntities(title)
						)}
					</h3>
					<p className="m-0 mt-1 text-xs italic">
						{sprintf(
							// translators: %s is a name
							_x(
								'By %s',
								'Preposition for "By Author Name"',
								'extendify-local',
							),
							provider,
						)}
					</p>
				</div>
				<p className="col-span-2 m-0 text-sm xs:col-span-1">
					{decodeEntities(description)}
				</p>
			</div>
			<div className="flex min-h-14 shrink-0 flex-col items-center justify-center p-3 px-5 xxs:flex-row xxs:justify-end">
				{priceTag && (
					<p
						className="m-0 mb-3 xxs:mb-0 xxs:mr-4"
						dangerouslySetInnerHTML={{ __html: decodeEntities(priceTag) }}
					/>
				)}
				{ctaType === 'plugin' && (
					<InstallPluginAction
						product={product}
						ctaContent={decodeEntities(ctaContent)}
						ctaPluginSlug={ctaPluginSlug}
					/>
				)}
				{ctaType === 'external-link' && (
					<ExternalLinkAction
						product={product}
						ctaContent={decodeEntities(ctaContent)}
						ctaExternalLink={ctaExternalLink}
					/>
				)}
				{ctaType === 'internal-link' && (
					<InternalLinkAction
						product={product}
						ctaContent={decodeEntities(ctaContent)}
						ctaInternalLink={ctaInternalLink}
					/>
				)}
			</div>
		</div>
	);
};

const InstallPluginAction = ({ product, ctaContent, ctaPluginSlug }) => {
	const [status, setStatus] = useState('idle');
	const [error, setError] = useState(null);

	const handleInstall = useCallback(async () => {
		recordActivity({
			slot: 'plugin-search',
			event: 'click-install',
			product,
		});

		try {
			setStatus('installing');
			await Promise.all([
				retryOperation(() => installPlugin(ctaPluginSlug), { maxAttempts: 2 }),
				// Sleep makes sure the installing UI is displayed for at least 1 second.
				sleep(1000),
			]);
		} catch (_) {
			setError(__('Failed to install the plugin', 'extendify-local'));
			setStatus('error');
			return;
		}

		recordPluginActivity({
			slug: ctaPluginSlug,
			source: 'search-recommendation-card',
		});

		try {
			setStatus('activating');
			await Promise.all([
				retryOperation(() => activatePlugin(ctaPluginSlug), { maxAttempts: 2 }),
				// Sleep makes sure the activating UI is displayed for at least 1 second.
				sleep(1000),
			]);
		} catch (_) {
			setError(__('Failed to activate the plugin', 'extendify-local'));
			setStatus('error');
			return;
		}

		setStatus('activated');
	}, [product, ctaPluginSlug]);

	const actionText = {
		idle: ctaContent,
		installing: _x(
			'Installing...',
			'Plugin installation status',
			'extendify-local',
		),
		activating: _x(
			'Activating...',
			'Plugin activation status',
			'extendify-local',
		),
		activated: _x('Activated', 'Plugin activation status', 'extendify-local'),
		error,
	};

	if (status === 'error') {
		return (
			<p className="m-0 flex items-center fill-wp-alert-red text-sm text-wp-alert-red">
				<Icon icon={caution} />
				{actionText[status]}
			</p>
		);
	}

	if (status === 'activated') {
		return (
			<p className="m-0 flex items-center fill-wp-alert-green text-sm text-wp-alert-green">
				<Icon icon={check} />
				{actionText[status]}
			</p>
		);
	}

	return (
		<Button
			className="min-w-24 whitespace-normal wrap-break-word rounded-xs bg-wp-theme-main px-3 align-middle text-sm text-design-text shadow-none hover:opacity-90 disabled:opacity-80"
			type="button"
			variant="secondary"
			size="compact"
			disabled={status !== 'idle'}
			isBusy={status !== 'idle'}
			onClick={handleInstall}
		>
			{actionText[status]}
		</Button>
	);
};

const ExternalLinkAction = ({ product, ctaContent, ctaExternalLink }) => {
	const ctaExternalLinkWithPartner = decodeEntities(ctaExternalLink).replace(
		'{PARTNERID}',
		window.extSharedData?.partnerId,
	);

	return (
		<a
			onClick={() =>
				recordActivity({
					slot: 'plugin-search',
					event: 'click-link-external',
					product,
				})
			}
			href={ctaExternalLinkWithPartner}
			target="_blank"
			className="relative flex min-h-8 min-w-24 cursor-pointer items-center justify-center whitespace-normal wrap-break-word rounded-xs bg-wp-theme-main fill-design-text py-1.5 pl-3 pr-9 text-center text-sm leading-tight text-design-text no-underline hover:opacity-90 focus:shadow-none"
		>
			{ctaContent}
			<Icon className="absolute right-3 h-5 w-5" icon={external} />
		</a>
	);
};

const InternalLinkAction = ({ product, ctaContent, ctaInternalLink }) => {
	return (
		<a
			onClick={() =>
				recordActivity({
					slot: 'plugin-search',
					event: 'click-link-internal',
					product,
				})
			}
			href={ctaInternalLink}
			className="relative flex min-h-8 min-w-24 cursor-pointer items-center justify-center whitespace-normal break-words rounded-xs bg-wp-theme-main fill-design-text px-3 py-[6px] text-center text-sm leading-tight text-design-text no-underline hover:opacity-90 focus:shadow-none"
		>
			{ctaContent}
		</a>
	);
};
