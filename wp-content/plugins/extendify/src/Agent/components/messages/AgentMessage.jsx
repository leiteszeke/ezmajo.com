import { recordAgentActivity } from '@agent/api';
import { AnimateChunks } from '@agent/components/messages/AnimateChunks';
import { ReplyOptions } from '@agent/components/ReplyOptions';
import { magic } from '@agent/icons';
import pageTours from '@agent/lib/page-tours';
import tours from '@agent/tours/tours';
import { SingleTour } from '@agent/workflows/misc/components/ToursList';
import { decodeEntities } from '@wordpress/html-entities';
import { __ } from '@wordpress/i18n';
import { cog, Icon, lifesaver, pencil, styles } from '@wordpress/icons';
import ReactMarkdown from 'react-markdown';

const availableTours = Object.values(tours);
const adminPages = window.extAgentData.agentContext?.availableAdminPages || [];
const agentSuggestions =
	Object.fromEntries(
		adminPages.map((page) => [
			page,
			{
				label: __('Take me there', 'extendify-local'),
				tour:
					availableTours.find((tour) => tour.id === pageTours[page]) ?? null,
			},
		]),
	) || {};

const agentIcons = {
	agent1: lifesaver,
	agent2: styles,
	agent3: pencil,
	agent4: cog,
};

export const AgentMessage = ({ message, animate, active }) => {
	const {
		content,
		role,
		pageSuggestion,
		qaSuggestions,
		agent,
		sessionId = 'not-set',
	} = message.details;
	const containsCodeBlock = /```[\s\S]*?```/.test(content);
	const blocks = containsCodeBlock
		? [decodeEntities(content ?? '')]
		: decodeEntities(content ?? '').split(/\n{2,}/);

	// Check if the pageSuggestion matches any key in agentSuggestions
	const agentSuggestionKey = Object.keys(agentSuggestions).find((k) =>
		pageSuggestion?.startsWith(k),
	);
	const agentSuggestion = agentSuggestions[agentSuggestionKey] || {};

	return (
		<div
			data-agent-message-role={role}
			className="flex w-full items-start gap-2.5 px-2.5 py-2"
		>
			<div className="w-7 shrink-0">
				{agent?.avatar ? (
					<img className="mt-px" src={agent.avatar} alt={agent.name} />
				) : (
					<Icon
						className="-mt-0.5 fill-gray-900"
						icon={agentIcons[agent?.id] ?? magic}
						size={28}
					/>
				)}
			</div>
			<div className="flex min-w-0 flex-1 flex-col gap-4">
				<div className="extendify-agent-markdown w-full">
					{animate ? (
						<AnimateChunks words={blocks} delay={0.1} duration={0.35} />
					) : (
						<ReactMarkdown>{decodeEntities(content)}</ReactMarkdown>
					)}
				</div>
				{agentSuggestion?.label ? (
					<div>
						<a
							onClick={() => {
								recordAgentActivity({
									sessionId,
									action: 'take_me_there_click',
									value: { pageSuggestion },
								});
							}}
							href={`${window.extSharedData.adminUrl}${pageSuggestion}`}
							className="rounded-sm border border-design-main bg-design-main p-2 text-sm text-white no-underline hover:opacity-90"
						>
							{agentSuggestion.label}
						</a>
					</div>
				) : null}
				{agentSuggestion?.tour && (
					<div>
						<SingleTour tour={agentSuggestion.tour} />
					</div>
				)}
				{/* An empty array still renders — it's the agent asking with no drafts. */}
				{active && Array.isArray(qaSuggestions) ? (
					<ReplyOptions
						options={qaSuggestions}
						onSubmit={(message) =>
							window.dispatchEvent(
								new CustomEvent('extendify-agent:chat-submit', {
									detail: { message },
								}),
							)
						}
					/>
				) : null}
			</div>
		</div>
	);
};
