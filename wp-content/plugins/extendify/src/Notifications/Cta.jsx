import classNames from 'classnames';
import {
	bannerButtonVariables,
	buttonHoverClasses,
	colorsOf,
	designButtonVariables,
} from './colors';
import { externalLinkProps } from './notification-link';

const VARIABLES = {
	banner: bannerButtonVariables,
	design: designButtonVariables,
};

export const Cta = ({
	notification,
	href,
	external,
	onClick,
	surface,
	className,
}) => {
	const ctaLabel = notification['cta-label'];
	if (!ctaLabel || !href) {
		return null;
	}

	const colors = colorsOf(notification);

	return (
		<a
			href={href}
			{...externalLinkProps(external)}
			onClick={onClick}
			className={classNames(className, buttonHoverClasses(colors))}
			style={VARIABLES[surface](colors)}
		>
			{ctaLabel}
		</a>
	);
};
