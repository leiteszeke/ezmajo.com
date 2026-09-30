import { Spinner } from '@wordpress/components';
import { useEffect, useRef, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { Icon } from '@wordpress/icons';
import classNames from 'classnames';
import { Cta } from '../Cta';
import {
	bannerButtonVariables,
	barVariables,
	buttonHoverClasses,
	colorsOf,
} from '../colors';
import { DismissButton } from '../DismissButton';
import { iconFor } from '../icons';
import { publishAndReload, publishesSite } from '../publish-site';

export const Bar = ({
	notification,
	href,
	external,
	dismissible,
	onDismiss,
	onClick,
}) => {
	const { title, content } = notification;
	const ctaLabel = notification['cta-label'];
	const icon = iconFor(notification.icon);
	const colors = colorsOf(notification);
	const ref = useRef(null);
	const [publishing, setPublishing] = useState(false);
	const publishes = publishesSite(notification);
	const ctaClassName = classNames(
		'inline-flex h-10 shrink-0 items-center gap-2 rounded-md bg-banner-main px-5 text-sm font-medium text-banner-text no-underline',
		// Both cursor utilities in one layer would leave the winner to CSS source order.
		publishing ? 'cursor-not-allowed' : 'cursor-pointer',
		!publishing && buttonHoverClasses(colors),
	);

	const publishNow = () => {
		setPublishing(true);
		publishAndReload(onClick);
	};

	// The agent reads this to keep its panel and the scaled page off the bar.
	useEffect(() => {
		const root = document.documentElement;
		const publish = () =>
			root.style.setProperty(
				'--extendify-notification-bar-height',
				// 0 below the breakpoint, where the bar is display:none.
				`${ref.current.offsetHeight}px`,
			);

		publish();
		const observer = new ResizeObserver(publish);
		observer.observe(ref.current);
		return () => {
			observer.disconnect();
			root.style.removeProperty('--extendify-notification-bar-height');
		};
	}, []);

	return (
		<aside
			ref={ref}
			aria-label={
				// translators: label for the bar reporting whether the site is public.
				__('Site status', 'extendify-local')
			}
			// Below core's admin-bar breakpoint a full-width banner covers the content it reports on.
			className="fixed bottom-0 left-0 right-0 z-higher hidden items-center gap-4 bg-design-main px-5 py-3.5 text-base text-design-text md:flex"
			style={barVariables(colors)}
			data-test="notification-bar"
		>
			{icon && (
				<span
					className="flex size-10 shrink-0 items-center justify-center rounded-full bg-banner-main text-banner-text"
					data-test="notification-bar-icon"
				>
					<Icon icon={icon} size={24} className="fill-current" />
				</span>
			)}
			<div className="min-w-0 flex-1">
				<div className="text-[15px] font-bold">{title}</div>
				<div className="mt-0.5 text-[13px]">{content}</div>
			</div>
			{ctaLabel && publishes && (
				<button
					type="button"
					onClick={publishNow}
					disabled={publishing}
					aria-busy={publishing}
					className={ctaClassName}
					style={bannerButtonVariables(colors)}
					data-test="notification-bar-publish"
				>
					{ctaLabel}
					{publishing && <Spinner className="m-0 h-4 text-banner-text" />}
				</button>
			)}
			{!publishes && (
				<Cta
					notification={notification}
					href={href}
					external={external}
					onClick={onClick}
					surface="banner"
					className="inline-flex h-10 shrink-0 cursor-pointer items-center rounded-md bg-banner-main px-5 text-sm font-medium text-banner-text no-underline"
				/>
			)}
			{dismissible && (
				<DismissButton
					onClick={onDismiss}
					size={24}
					className="flex size-8 shrink-0 items-center justify-center rounded-xs text-design-text hover:opacity-80"
				/>
			)}
		</aside>
	);
};
