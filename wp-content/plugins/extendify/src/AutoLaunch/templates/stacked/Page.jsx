import { PageCanvas } from '@auto-launch/templates/PageCanvas';
import { CARD } from '@auto-launch/templates/surface';
import classNames from 'classnames';

const BOX = [
	CARD,
	'flex flex-col items-center justify-center',
	'[gap:var(--ext-tpl-progress-gap,12px)]',
	'[height:var(--ext-tpl-progress-height,400px)]',
].join(' ');

export const Page = ({ parts, has }) => (
	<PageCanvas>
		<div className="w-full flex flex-col items-center gap-ui md:gap-ui-lg m-auto">
			<div className="mb-ui-block">{parts.logo}</div>
			<div
				className={classNames('relative z-10 w-full max-w-ui', has.card && BOX)}
			>
				{parts.graphic}
				{parts.status}
			</div>
		</div>
	</PageCanvas>
);
