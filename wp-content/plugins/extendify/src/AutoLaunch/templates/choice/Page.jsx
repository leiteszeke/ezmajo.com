import { PageCanvas } from '@auto-launch/templates/PageCanvas';
import { CARD } from '@auto-launch/templates/surface';
import { arrowRight, Icon } from '@wordpress/icons';
import classNames from 'classnames';

// Makes room for the highlighted box's negative top margin.
const GRID = [
	'relative z-10 grid w-full sm:mx-auto sm:grid-cols-2 sm:pt-7',
	'[gap:var(--ext-tpl-choice-gap,24px)]',
].join(' ');

const WIDE = [
	'sm:[max-width:var(--ext-tpl-choice-width,672px)]',
	'sm:[align-items:var(--ext-tpl-choice-align,stretch)]',
].join(' ');

const BOX = [
	CARD,
	'flex flex-col overflow-hidden text-left text-ui-ink',
	'[gap:var(--ext-tpl-choice-box-gap,0px)]',
].join(' ');

const HIGHLIGHT = [
	'[border-width:var(--ext-tpl-choice-highlight-border,3px)]',
	'border-ui-action sm:-mt-7',
].join(' ');

const BADGE = [
	'flex items-center justify-center bg-ui-action',
	'[height:var(--ext-tpl-choice-badge-height,28px)]',
	'text-ui-status font-ui-status text-ui-action-text',
].join(' ');

const ICON_STRIP = [
	'flex items-center justify-center text-ui-ink',
	'[padding-block:var(--ext-tpl-choice-icon-pad,40px)]',
].join(' ');

const BODY = 'flex flex-1 flex-col justify-between gap-ui p-ui';

const COPY = 'flex flex-col [gap:var(--ext-tpl-choice-copy-gap,8px)]';

const BUTTON = [
	'inline-flex w-full items-center justify-between gap-2 rounded-ui-button',
	'[padding:var(--ext-tpl-choice-button-pad,10px)_var(--ext-tpl-choice-button-pad-x,20px)]',
	'text-ui-body font-ui-body transition focus:outline-none',
	'focus-visible:ring-1 focus-visible:ring-ui-line',
].join(' ');

const Box = ({
	icon,
	badgeLabel,
	heading,
	description,
	buttonLabel,
	buttonIcon = arrowRight,
	highlight,
	onClick,
}) => (
	<div className={classNames(BOX, highlight ? HIGHLIGHT : 'border-ui')}>
		{highlight && badgeLabel && <span className={BADGE}>{badgeLabel}</span>}
		<span className={ICON_STRIP}>
			<Icon fill="currentColor" icon={icon} size={40} />
		</span>
		<span className={BODY}>
			<span className={COPY}>
				{heading && (
					<span className="text-ui-body font-ui-heading font-ui-strong">
						{heading}
					</span>
				)}
				<span className="text-ui-body opacity-70">{description}</span>
			</span>
			<button
				type="button"
				onClick={onClick}
				className={classNames(
					BUTTON,
					highlight
						? 'border-ui border-ui-action bg-ui-action text-ui-action-text hover:opacity-90'
						: 'border-ui border-ui-line bg-ui-secondary-fill text-ui-secondary-text',
				)}
			>
				{buttonLabel}
				<Icon fill="currentColor" icon={buttonIcon} size={20} />
			</button>
		</span>
	</div>
);

export const Page = ({ parts, has }) => (
	<PageCanvas>
		<div className="w-full flex flex-col items-center gap-ui md:gap-ui-lg m-auto">
			<div className="mb-ui-block">{parts.logo}</div>
			{has.heading && parts.heading}
			<div className={classNames(GRID, WIDE)}>
				{(parts.options ?? []).map(({ key, ...option }) => (
					<Box key={key} {...option} />
				))}
			</div>
		</div>
		{has.footer && <div className="w-full pt-8 shrink-0">{parts.footer}</div>}
	</PageCanvas>
);
