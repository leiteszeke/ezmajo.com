import { loaderThreeDots } from '@auto-launch/icons';
import { activeModalTemplate } from '@auto-launch/templates';

// The template's box draws the card, or an overlay's surface settings reach
// nothing on the screens whose content brought its own.
export const WaitBox = ({ icon, message, note }) => (
	<div className="flex flex-col items-center gap-3">
		<div className="h-8 w-8 fill-current text-ui-ink">
			{icon ?? loaderThreeDots}
		</div>
		<p className="m-0 text-center text-ui-body leading-ui text-ui-ink">
			{message}
		</p>
		{note ? (
			<p className="m-0 max-w-md text-center text-ui-body leading-ui text-ui-ink opacity-70">
				{note}
			</p>
		) : null}
	</div>
);

export const WaitingOverlay = ({ show, icon, message, note }) => {
	if (!show) return null;
	const Page = activeModalTemplate();
	return (
		<Page
			parts={{ body: <WaitBox icon={icon} message={message} note={note} /> }}
			has={{ card: true }}
		/>
	);
};
