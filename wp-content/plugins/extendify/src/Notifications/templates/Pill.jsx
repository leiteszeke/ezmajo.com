import { useState } from '@wordpress/element';
import { Icon } from '@wordpress/icons';
import classNames from 'classnames';
import { bannerButtonVariables, buttonHoverClasses, colorsOf } from '../colors';
import { iconFor } from '../icons';
import { externalLinkProps } from '../notification-link';
import { publishAndReload, publishesSite } from '../publish-site';

export const Pill = ({ notification, href, external, onClick }) => {
	const ctaLabel = notification['cta-label'];
	const icon = iconFor(notification.icon);
	const colors = colorsOf(notification);
	const [publishing, setPublishing] = useState(false);
	const publishes = publishesSite(notification);
	// Core's admin bar is taller below the md breakpoint; the pill matches it.
	const className = classNames(
		'inline-flex h-7.5 shrink-0 items-center gap-1 rounded-sm bg-banner-main px-2.5 text-sm leading-none text-banner-text no-underline md:h-6 md:text-[13px]',
		publishing ? 'cursor-not-allowed' : 'cursor-pointer',
		!publishing && buttonHoverClasses(colors),
	);
	// The pill has no room for a spinner, so the reload is the only feedback.
	const publishNow = () => {
		setPublishing(true);
		publishAndReload(onClick);
	};

	const shared = {
		// Without this the pill has no accessible name where CSS hides the label.
		'aria-label': ctaLabel,
		className,
		style: bannerButtonVariables(colors),
		'data-test': 'notification-pill',
	};
	const label = (
		<>
			{icon && <Icon icon={icon} size={16} className="fill-current" />}
			<span className="ext-notification-pill-label">{ctaLabel}</span>
		</>
	);

	if (publishes) {
		return (
			<button
				type="button"
				onClick={publishNow}
				disabled={publishing}
				aria-busy={publishing}
				{...shared}
			>
				{label}
			</button>
		);
	}

	return (
		<a
			href={href}
			{...externalLinkProps(external)}
			onClick={onClick}
			{...shared}
		>
			{label}
		</a>
	);
};
