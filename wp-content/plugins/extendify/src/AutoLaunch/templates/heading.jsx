import { chevronLeft, Icon } from '@wordpress/icons';

const TITLE = [
	'text-ui-heading md:text-ui-heading-lg text-pretty text-ui-page-text',
	'font-ui-heading font-ui-strong tracking-ui-heading p-0 m-0 text-center',
].join(' ');

const SUBTITLE = [
	'text-sm md:text-ui-body text-pretty text-ui-page-text font-ui-body',
	'opacity-70 p-0 m-0 text-center max-w-xl',
].join(' ');

const LINK = [
	'inline-flex items-center gap-0.5 border-0 bg-transparent cursor-pointer',
	'text-sm text-ui-page-text opacity-70 hover:opacity-100 transition-opacity',
].join(' ');

export const Heading = ({ title, subtitle }) => (
	<div className="flex flex-col items-center gap-2">
		<h2 className={TITLE}>{title}</h2>
		{subtitle && <p className={SUBTITLE}>{subtitle}</p>}
	</div>
);

export const PageLink = ({ label, href, icon = chevronLeft, onClick }) =>
	href ? (
		<a className={LINK} href={href} onClick={onClick}>
			<Icon fill="currentColor" icon={icon} size={20} />
			{label}
		</a>
	) : (
		<button className={LINK} type="button" onClick={onClick}>
			<Icon fill="currentColor" icon={icon} size={20} />
			{label}
		</button>
	);
