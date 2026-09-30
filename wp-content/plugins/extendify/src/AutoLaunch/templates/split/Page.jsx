import { PageCanvas } from '@auto-launch/templates/PageCanvas';

// The heading centers itself for the stacked layout, so a column undoes it.
const LEFT_ALIGN = '[&_h2]:lg:text-left [&_p]:lg:text-left';

// Direction is lg-only: below it the columns stack whatever the token says.
const COLUMNS = [
	'm-auto flex w-full max-w-5xl flex-col items-center',
	'lg:[flex-direction:var(--ext-tpl-split-direction,row)]',
	'[gap:var(--ext-tpl-split-gap,48px)]',
].join(' ');

// align-self, so moving the text does not move the form with it.
const TEXT_COLUMN = [
	'flex flex-col items-center gap-ui lg:items-start',
	'lg:[flex:0_1_var(--ext-tpl-split-text-width,420px)]',
	'lg:[align-self:var(--ext-tpl-split-text-align,flex-start)]',
	LEFT_ALIGN,
].join(' ');

export const Page = ({ parts, has }) => (
	<PageCanvas>
		<div className={COLUMNS}>
			<div className={TEXT_COLUMN}>
				{parts.logo}
				{has.heading && parts.heading}
			</div>
			<div className="relative z-10 w-full lg:flex-1">{parts.content}</div>
		</div>
		{has.footer && <div className="w-full pt-8 shrink-0">{parts.footer}</div>}
	</PageCanvas>
);
