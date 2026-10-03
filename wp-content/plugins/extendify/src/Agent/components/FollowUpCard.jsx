import { useFollowUpHistory } from '@agent/follow-ups/history';
import { cards } from '@agent/follow-ups/registry';
import { useChatStore } from '@agent/state/chat';
import { workflows } from '@agent/workflows/workflows';
import { track } from '@shared/lib/track';
import { useEffect } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { close as closeIcon, Icon } from '@wordpress/icons';

const submitFor = ({ message, workflowId }) => {
	if (message) return { message };
	const target = workflows.find(({ id }) => id === workflowId);
	return { message: target?.example?.text };
};

export const FollowUpCard = ({ message }) => {
	const updateMessage = useChatStore((state) => state.updateMessage);
	const {
		cards: history,
		markShown,
		markClicked,
		markDismissed,
	} = useFollowUpHistory();
	const { workflowId, followUp, followUpData: data } = message.details;
	const card = cards.find(({ id }) => id === followUp);
	const shownFor = history[card?.id]?.shownFor;

	// Without shownFor, every reload with the card open counts another view.
	useEffect(() => {
		if (!card || shownFor === message.id) return;
		markShown(card.id, message.id);
		track('agent_follow_up_view', { id: card.id, workflowId });
	}, [card, shownFor, message.id, markShown, workflowId]);

	// Partner offers count an impression per showing, not per message.
	useEffect(() => {
		card?.onView?.(data);
	}, [card, data]);

	if (!card) return null;

	const { title, body, action } = card.content?.(data) ?? card;
	const close = () => updateMessage(message.id, { followUpClosed: true });
	const handleClick = () => {
		markClicked(card.id);
		track('agent_follow_up_click', { id: card.id, workflowId });
		card.onClick?.(data);
		close();
	};
	const handleDismiss = () => {
		markDismissed(card.id);
		track('agent_follow_up_dismiss', { id: card.id, workflowId });
		close();
	};
	const handleAction = () => {
		handleClick();
		window.dispatchEvent(
			new CustomEvent('extendify-agent:chat-submit', {
				detail: submitFor(action),
			}),
		);
	};
	const primary =
		'rounded-sm border border-design-main bg-transparent px-3 py-1.5 text-sm text-design-main hover:opacity-80';

	return (
		<div className="relative mt-2 max-w-[90%] rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm text-gray-900">
			<button
				type="button"
				className="absolute end-2 top-2 flex items-center rounded-none border-0 bg-transparent p-0 text-gray-700 outline-hidden ring-design-main hover:text-gray-900 focus:shadow-none focus:outline-hidden focus-visible:outline-design-main"
				onClick={handleDismiss}
			>
				<Icon
					className="pointer-events-none fill-current leading-none"
					icon={closeIcon}
					size={16}
				/>
				<span className="sr-only">
					{
						// translators: Screen-reader label for the X button that hides a suggested next step card in the AI Agent chat.
						__('Dismiss', 'extendify-local')
					}
				</span>
			</button>
			<p className="m-0 pe-6 font-semibold">{title}</p>
			{body && <p className="m-0 mt-1">{body}</p>}
			<div className="mt-3 flex flex-wrap gap-2">
				{action.url ? (
					<a
						href={action.url}
						target="_blank"
						rel="noopener noreferrer"
						className={`${primary} no-underline`}
						onClick={handleClick}
					>
						{action.label}
					</a>
				) : (
					<button type="button" className={primary} onClick={handleAction}>
						{action.label}
					</button>
				)}
			</div>
		</div>
	);
};
