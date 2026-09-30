import { PageCanvas } from '@auto-launch/templates/PageCanvas';

export const Page = ({ parts, has }) => (
	<PageCanvas>
		<div className="w-full flex flex-col items-center gap-ui md:gap-ui-lg m-auto">
			<div className="mb-ui-block">{parts.logo}</div>
			{has.heading && parts.heading}
			<div className="relative z-10 w-full max-w-ui">{parts.content}</div>
		</div>
		{has.footer && <div className="w-full pt-8 shrink-0">{parts.footer}</div>}
	</PageCanvas>
);
