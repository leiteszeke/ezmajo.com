import { useCanvasWorkflow } from '@agent/components/Canvas';
import { ErrorMessage } from '@agent/components/ErrorMessage';
import { AgentMessage } from '@agent/components/messages/AgentMessage';
import { ImageToolMessage } from '@agent/components/messages/ImageToolMessage';
import { StatusIndicator } from '@agent/components/messages/StatusIndicator';
import { ToolReceipt } from '@agent/components/messages/ToolReceipt';
import { UserMessage } from '@agent/components/messages/UserMessage';
import { WorkflowComponent } from '@agent/components/messages/WorkflowComponent';
import { WorkflowMessage } from '@agent/components/messages/WorkflowMessage';
import { ScrollDownButton } from '@agent/components/ScrollDownButton';
import { useWhenFinishedToolProps } from '@agent/hooks/useWhenFinishedToolProps';
import { useChatStore } from '@agent/state/chat';
import { useGlobalStore } from '@agent/state/global';
import { useWorkflowStore } from '@agent/state/workflows';
import { ImageAcquisitionRequest } from '@agent/workflows/abilities/components/ImageAcquisitionRequest';
import {
	AbilityRun,
	hasRunComponent,
} from '@agent/workflows/abilities/components/run';
import {
	createElement,
	Fragment,
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
} from '@wordpress/element';
import { decodeEntities } from '@wordpress/html-entities';
import { __, sprintf } from '@wordpress/i18n';

// The raw validation text names schema paths the user can do nothing with.
const abilityLabel = (name) =>
	(window.extAgentData?.wpAbilities ?? [])
		.flatMap((category) => category.abilities ?? [])
		.find((ability) => ability.name === name)?.label || name;

export const ChatMessages = () => {
	const { open } = useGlobalStore();
	const { messages } = useChatStore();
	const { getWorkflow } = useWorkflowStore();
	const workflow = getWorkflow();
	const whenFinishedToolProps = useWhenFinishedToolProps();
	const canvasWorkflow = useCanvasWorkflow();
	const whenFinishedComponent = workflow?.whenFinished?.component;
	const [canScrollDown, setCanScrollDown] = useState(false);
	const containerRef = useRef(null);
	const isFreshPageLoad = useRef(true);
	const [ready, setReady] = useState(false);
	const userScrolledAway = useRef(false);
	const confirmScrolledFor = useRef(null);
	// Remounting into another layout would otherwise animate the whole backlog past.
	const settling = useRef(true);
	const behavior = () => {
		if (!settling.current) return 'smooth';
		settling.current = false;
		return 'auto';
	};

	const lastId = messages.at(-1)?.id;
	const lastDetails = messages.at(-1)?.details;
	const pendingTool =
		messages.at(-1)?.type === 'tool' && !('result' in (lastDetails ?? {}));
	// Both render their own waiting state, so the shared status line doubles it.
	const awaitingPicker =
		pendingTool &&
		(lastDetails?.id === 'acquire-image' || hasRunComponent(lastDetails?.id));

	// If last message is a user message, move it to the top
	const isUserMessage = messages.at(-1)?.details?.role === 'user';

	useEffect(() => {
		// The frontend agent shows the chat even while the store says closed.
		if (!containerRef.current) return;
		if (!isFreshPageLoad.current) return;
		isFreshPageLoad.current = false;
		// Scroll to the bottom of the chat container on load
		const c = containerRef.current;
		const last = c.querySelector(
			'#extendify-agent-chat-scroll-area > :last-child',
		);
		let id2;
		const id = requestAnimationFrame(() => {
			id2 = requestAnimationFrame(() => {
				last?.scrollIntoView({ behavior: 'auto', block: 'start' });
				setReady(true);
			});
		});
		// A hidden tab suspends animation frames, leaving the list invisible.
		const fallback = setTimeout(() => setReady(true), 500);
		return () => {
			cancelAnimationFrame(id);
			cancelAnimationFrame(id2);
			clearTimeout(fallback);
			isFreshPageLoad.current = true;
			setReady(false);
		};
	}, [open]);

	// A manual scroll means the user left the live edge on purpose — stop
	// following until they send again.
	useEffect(() => {
		const c = containerRef.current;
		if (!c) return;
		const markScrolled = () => {
			userScrolledAway.current = true;
		};
		c.addEventListener('wheel', markScrolled, { passive: true });
		c.addEventListener('touchmove', markScrolled, { passive: true });
		return () => {
			c.removeEventListener('wheel', markScrolled);
			c.removeEventListener('touchmove', markScrolled);
		};
	}, []);

	useEffect(() => {
		if (isUserMessage) userScrolledAway.current = false;
	}, [isUserMessage, messages]);

	const pinTarget = whenFinishedToolProps?.id
		? 'confirm'
		: awaitingPicker
			? `picker-${lastId}`
			: null;

	// Follow new agent content while it streams in.
	useEffect(() => {
		if (!ready || isUserMessage) return;
		if (userScrolledAway.current) return;
		if (pinTarget) return;
		const c = containerRef.current;
		const last = c?.querySelector(
			'#extendify-agent-chat-scroll-area > :last-child',
		);
		if (!last) return;
		const id = requestAnimationFrame(() => {
			// block:'end' scrolls UP for already-visible content — only reveal overflow.
			const overflows =
				last.getBoundingClientRect().bottom > c.getBoundingClientRect().bottom;
			if (!overflows) return;
			last.scrollIntoView({ behavior: behavior(), block: 'end' });
		});
		return () => cancelAnimationFrame(id);
	}, [ready, isUserMessage, messages, pinTarget]);

	// A confirm or picker demands action — pin its reply so both stay visible.
	useEffect(() => {
		if (!pinTarget) {
			confirmScrolledFor.current = null;
			return;
		}
		if (!ready || confirmScrolledFor.current === pinTarget) return;
		const c = containerRef.current;
		const scrollArea = c?.querySelector('#extendify-agent-chat-scroll-area');
		const tool = scrollArea?.lastElementChild;
		if (!c || !scrollArea || !tool) return;
		const pinWhenOutOfView = () => {
			if (confirmScrolledFor.current === pinTarget) return;
			const cRect = c.getBoundingClientRect();
			const toolRect = tool.getBoundingClientRect();
			if (toolRect.top >= cRect.top && toolRect.bottom <= cRect.bottom) return;
			confirmScrolledFor.current = pinTarget;
			const replies = c.querySelectorAll(
				'[data-agent-message-role="assistant"]',
			);
			const target = replies[replies.length - 1] ?? tool;
			const offset =
				target.getBoundingClientRect().top -
				scrollArea.getBoundingClientRect().top;
			scrollArea.style.minHeight = `${offset + c.clientHeight}px`;
			target.scrollIntoView({ behavior: behavior(), block: 'start' });
		};
		pinWhenOutOfView();
		// The confirm grows while its preview loads and can leave the viewport.
		const observer = new ResizeObserver(pinWhenOutOfView);
		observer.observe(tool);
		return () => observer.disconnect();
	}, [ready, pinTarget]);

	// Handles scrolling to the top of the last user message
	// TODO: if the user sends in a long message, maybe we scroll to the bottom
	// of the message offset by 2-3 lines
	useEffect(() => {
		if (!containerRef.current) return;
		if (!isUserMessage) return;
		const c = containerRef.current;
		const messages = c.querySelectorAll('[data-agent-message-role="user"]');
		const last = messages[messages.length - 1];
		if (!last || messages.length < 2) return;
		const scrollArea = c.querySelector('#extendify-agent-chat-scroll-area');
		// Reaching the top needs a viewport of room below the message's own offset.
		const offset =
			last.getBoundingClientRect().top - scrollArea.getBoundingClientRect().top;
		scrollArea.style.minHeight = `${offset + c.clientHeight}px`;
		last.scrollIntoView({ behavior: 'smooth', block: 'start' });
	}, [isUserMessage, messages]);

	// Chasing suggestions from far up the transcript would move the page.
	const lastIsWorkflow = messages.at(-1)?.type === 'workflow';
	useEffect(() => {
		if (!lastIsWorkflow) return;
		const c = containerRef.current;
		const last = c?.querySelector(
			'#extendify-agent-chat-scroll-area > :last-child',
		);
		if (!last) return;
		const below =
			last.getBoundingClientRect().top - c.getBoundingClientRect().bottom;
		if (below > c.clientHeight * 2) return;
		last.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
	}, [lastIsWorkflow, messages]);

	// Handles the scroll down button visibility
	useLayoutEffect(() => {
		const c = containerRef.current;
		if (!c) return;
		const last = c.querySelector(
			'#extendify-agent-chat-scroll-area > :last-child',
		);
		if (!last) return;

		const areWeAtBottom = c.scrollTop + c.clientHeight >= c.scrollHeight - 4;
		if (areWeAtBottom) return setCanScrollDown(false);

		const observer = new IntersectionObserver(
			([entry]) => {
				const last = c.querySelector(
					'#extendify-agent-chat-scroll-area > :last-child',
				);
				if (!last) return setCanScrollDown(false);
				const areWeAtBottom =
					c.scrollTop + c.clientHeight >= c.scrollHeight - 4;
				if (areWeAtBottom) return setCanScrollDown(false);
				setCanScrollDown(!entry.isIntersecting);
			},
			{ root: c, threshold: 0.1 },
		);

		observer.observe(last);
		return () => observer.disconnect();
	}, [messages]);

	return (
		<div
			ref={containerRef}
			style={{ overscrollBehavior: 'contain' }}
			className="relative grow overflow-y-auto overflow-x-hidden p-1 pb-0 text-sm text-gray-900 md:p-2"
		>
			<div
				id="extendify-agent-chat-scroll-area"
				className={ready ? '' : 'invisible pointer-events-none'}
			>
				{messages.map((message) => {
					const freshLoad = isFreshPageLoad.current;
					if (message.details?.role === 'user') {
						return <UserMessage key={message.id} message={message} />;
					}
					if (message.details?.role === 'assistant') {
						return (
							<AgentMessage
								key={message.id}
								animate={!freshLoad}
								active={message.id === messages.at(-1)?.id}
								message={message}
							/>
						);
					}
					if (message.type === 'workflow') {
						return <WorkflowMessage key={message.id} message={message} />;
					}
					if (message.type === 'workflow-component') {
						return <WorkflowComponent key={message.id} message={message} />;
					}
					if (message.type === 'canvas-notice') {
						return (
							<ToolReceipt key={message.id}>
								{
									// translators: Shown in the agent chat when the user asks for something the open canvas cannot do. Canvas is the panel open on screen beside the chat.
									__(
										'Canvas interactions are limited. When finished, use the button in the top corner to exit.',
										'extendify-local',
									)
								}
							</ToolReceipt>
						);
					}
					if (
						message.type === 'tool' &&
						message.details?.id === 'acquire-image'
					) {
						// Unanswered and last is still live; anything earlier is history.
						if (!('result' in message.details) && message.id === lastId) {
							return (
								<ImageAcquisitionRequest key={message.id} message={message} />
							);
						}
						// Only an answered picker reports a skip; anything else got no image.
						const answer = message.details?.result;
						return (
							<ImageToolMessage
								key={message.id}
								url={answer?.url}
								failed={!!answer && !answer.url && !answer.skipped}
							/>
						);
					}
					if (message.type === 'tool') {
						const failure = message.details?.result?.error;
						const runnable = hasRunComponent(message.details?.id);
						// A run component reports its own outcome; a second line repeats it.
						const receipt = !runnable && !failure && message.details?.label;
						if (!runnable && !failure && !receipt) return null;
						return (
							<Fragment key={message.id}>
								{runnable ? (
									<AbilityRun
										id={message.details.id}
										inputs={message.details.inputs}
										result={message.details.result}
									/>
								) : null}
								{failure ? (
									<ErrorMessage>
										{sprintf(
											// translators: %s is the name of the task the agent tried to run.
											__('Error running %s.', 'extendify-local'),
											abilityLabel(message.details.id),
										)}
									</ErrorMessage>
								) : null}
								{receipt ? (
									<ToolReceipt>{decodeEntities(receipt)}</ToolReceipt>
								) : null}
							</Fragment>
						);
					}
					// Otherwise the live picker sits under its own receipt.
					if (message.type === 'image') {
						const live =
							!message.details?.url &&
							message.id === lastId &&
							whenFinishedToolProps?.id;
						if (live) return null;
						return (
							<ImageToolMessage key={message.id} url={message.details?.url} />
						);
					}
					return null;
				})}
				{/* The tool-running status reads as stuck while the picker waits on the user. */}
				{awaitingPicker ? null : <StatusIndicator />}
				{!workflow?.needsRedirect?.() &&
				whenFinishedToolProps?.id &&
				!canvasWorkflow &&
				whenFinishedComponent
					? createElement(whenFinishedComponent, whenFinishedToolProps)
					: null}
				{workflow?.needsRedirect?.() ? <workflow.redirectComponent /> : null}
			</div>
			<ScrollDownButton
				canScrollDown={canScrollDown}
				onClick={() => {
					if (!containerRef.current) return;
					const c = containerRef.current;
					// Scroll the last message into view
					const last = c.querySelector(
						'#extendify-agent-chat-scroll-area > :last-child',
					);
					if (!last) return;
					last.scrollIntoView({ behavior: 'smooth', block: 'start' });
				}}
			/>
		</div>
	);
};
