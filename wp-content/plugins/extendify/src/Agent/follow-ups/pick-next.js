import { recent, useFollowUpHistory } from '@agent/follow-ups/history';
import { cards } from '@agent/follow-ups/registry';
import { useChatStore } from '@agent/state/chat';

// An error ends a run without a workflow message.
export const toolCallsThisRun = (messages) => {
	const start = messages.findLastIndex(
		({ type, details }) =>
			type === 'workflow' || (type === 'message' && details?.error),
	);
	return messages
		.slice(start + 1)
		.filter(
			({ type, details }) =>
				type === 'tool' && 'result' in details && !details.result?.error,
		)
		.map(({ details }) => details);
};

const evaluate = (card, ctx) => {
	try {
		const data = card.data?.(ctx);
		return { id: card.id, data, score: card.score({ ...ctx, data }) };
	} catch (error) {
		// A throw here would drop the run's finish message.
		window.extSharedData?.devbuild && console.error(error);
		return { id: card.id, score: 0 };
	}
};

const isUserMessage = ({ type, details }) =>
	type === 'message' && details?.role === 'user';

export const cardMessageIndex = (messages) => {
	const index = messages.findLastIndex(({ type }) => type === 'workflow');
	if (index < 0 || messages.slice(index + 1).some(isUserMessage)) return -1;
	return index;
};

// A card the user took, or whose task they just did, drops behind the rest.
const TAKEN = 0.1;

export const pickNextCard = ({
	workflowId,
	status,
	messages = useChatStore.getState().messages,
}) => {
	const { context, abilities } = window.extAgentData ?? {};
	const { cards: history, workflows: done = {} } =
		useFollowUpHistory.getState();
	const toolCalls = toolCallsThisRun(messages);
	const tools = toolCalls.map(({ id }) => id);
	const ctx = { workflowId, status, tools, toolCalls, context, abilities };
	const [best] = cards
		.filter(
			({ id, follows, statuses = ['completed'] }) =>
				!history[id]?.dismissedAt &&
				(follows === '*' || follows.includes(workflowId)) &&
				statuses.includes(status),
		)
		.map((card) => {
			const entry = history[card.id] ?? {};
			const result = evaluate(card, { ...ctx, history: entry });
			const taken =
				recent(entry.clickedAt) || recent(done[card.action?.workflowId]);
			return {
				...result,
				score: taken ? result.score * TAKEN : result.score,
				shownAt: entry.shownAt ?? 0,
				order: card.order ?? 0,
			};
		})
		.filter(({ score }) => score > 0)
		// Equal scores rotate: the card shown longest ago goes first.
		.toSorted(
			(a, b) => b.score - a.score || a.shownAt - b.shownAt || a.order - b.order,
		);
	return best ?? null;
};
