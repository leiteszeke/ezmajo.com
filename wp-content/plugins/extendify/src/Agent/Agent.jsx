import {
	callTool,
	handleCanvas,
	handleWorkflow,
	pickWorkflow,
	recordAgentActivity,
} from '@agent/api';
import { Chat } from '@agent/Chat';
import {
	Canvas,
	useCanvasAssist,
	useCanvasOpen,
} from '@agent/components/Canvas';
import { ChatInput } from '@agent/components/ChatInput';
import { ChatMessages } from '@agent/components/ChatMessages';
import { UsageMessage } from '@agent/components/messages/UsageMessage';
import { useLockPost } from '@agent/hooks/useLockPost';
import { isAbilityTool, isAbilityWorkflow } from '@agent/lib/abilities';
import {
	getClientToolFallbackReply,
	getClientTools,
} from '@agent/lib/client-tools';
import { localPickWorkflow } from '@agent/lib/local-pick';
import { getRedirectUrl } from '@agent/lib/redirects';
import { doReload } from '@agent/lib/reload';
import { useCanvasStore } from '@agent/state/canvas';
import { useChatStore } from '@agent/state/chat';
import { useGlobalStore } from '@agent/state/global';
import { useStatusStore } from '@agent/state/status';
import { useSuggestionsStore } from '@agent/state/suggestions';
import { useWorkflowStore } from '@agent/state/workflows';
import { hasRunComponent } from '@agent/workflows/abilities/components/run';
import startOnboardingWorkflow from '@agent/workflows/misc/start-onboarding';
import { useQuickEditStore } from '@quick-edit/state/store';
import { digest } from '@shared/api/digest';
import {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from '@wordpress/element';
import { __, _n, sprintf } from '@wordpress/i18n';

const devmode = window.extSharedData.devbuild;
// Logged with tool errors: the banner sends users here and support needs to
// know which site the console they paste came from.
const { siteId } = window.extSharedData;
// Used to abort when wf canceled - reset in cleanup()
let controller = new AbortController();
const { postId } = window?.extAgentData?.context || {};

// Floor a resolution so its result doesn't re-render over the still-animating
// scroll-to-top, which leaves the chat scrolled to the wrong place.
const withMinDuration = async (promise, ms) => {
	const [result] = await Promise.all([
		promise,
		new Promise((resolve) => setTimeout(resolve, ms)),
	]);
	return result;
};

// cleanup() swaps in a fresh controller; a signal read after the wait is never aborted.
const canceledDuring = async (ms) => {
	const { signal } = controller;
	await new Promise((resolve) => setTimeout(resolve, ms));
	return signal.aborted;
};

export const Agent = () => {
	const { addMessage, updateMessage, popMessage, messages } = useChatStore();
	const { pushStatus, clearStatuses, leavingPage } = useStatusStore();
	const {
		mergeWorkflowData,
		getWorkflow,
		getWorkflowByExample,
		workflowData,
		setWorkflow,
		setWhenFinishedToolProps,
		whenFinishedToolProps,
		getAvailableWorkflows,
		requireBlock,
	} = useWorkflowStore();
	const block = useQuickEditStore((s) => s.agentBlock);
	const setBlock = useQuickEditStore((s) => s.setAgentBlock);
	const { open, setOpen, updateRetryAfter, isChatAvailable } = useGlobalStore();
	useLockPost({ postId, enabled: !!open });
	const [canType, setCanType] = useState(true);
	const agentWorking = useRef(false);
	const toolWorking = useRef(false);
	const retrying = useRef(false);
	// Starting false would re-run the agent's last turn on every reload.
	const [waitingOnToolOrUser, setWaitingOnToolOrUser] = useState(() => {
		const last = useChatStore.getState().messages.at(-1);
		if (last?.type === 'tool') return !('result' in (last.details ?? {}));
		return last?.type === 'message' && last.details?.role === 'assistant';
	});
	const [loop, setLoop] = useState(0);
	const workflow = getWorkflow();
	const canvasOpen = useCanvasOpen();
	const canvasAssist = useCanvasAssist();
	const canvasNoticeShown = useRef(false);
	const chatAvailable = useMemo(() => isChatAvailable(), [isChatAvailable]);
	const { addSuggestions, getSuggestions } = useSuggestionsStore();
	// Options render only while their message is last; a reply dismisses them.
	const lastMessage = messages.at(-1);
	const qaSuggestions =
		lastMessage?.type === 'message' &&
		lastMessage.details?.role === 'assistant' &&
		Array.isArray(lastMessage.details?.qaSuggestions)
			? lastMessage.details.qaSuggestions
			: null;

	// Without this the input stays disabled for as long as the canvas is open.
	useEffect(() => {
		if (canvasOpen && canvasAssist) setCanType(true);
		// A workflow reached by example carries no sessionId to key this on.
		if (!canvasOpen) canvasNoticeShown.current = false;
	}, [canvasOpen, canvasAssist]);

	const cleanup = useCallback(() => {
		setCanType(true);
		agentWorking.current = false;
		setWaitingOnToolOrUser(false);
		controller = new AbortController();
		const { agentBlock, setCommittedSelection } = useQuickEditStore.getState();
		agentBlock && setBlock(null);
		// A class or pin left up freezes Quick Edit hover site-wide.
		document
			.querySelector('.wp-site-blocks')
			?.classList.remove('extendify-agent-working', 'extendify-agent-busy');
		setCommittedSelection(null);
		clearStatuses();
		window.dispatchEvent(new Event('extendify-agent:remove-block-highlight'));
	}, [setBlock, clearStatuses]);

	useEffect(() => {
		const handle = ({ detail }) => {
			if (!detail?.id) return;
			updateMessage(detail.id, { result: detail.result });
			setWaitingOnToolOrUser(false);
			agentWorking.current = false;
			// The main loop parks on a staged tool; leaving one strands the run.
			setWhenFinishedToolProps(null);
			setLoop((prev) => prev + 1);
		};
		window.addEventListener('extendify-agent:client-tool-done', handle);
		return () =>
			window.removeEventListener('extendify-agent:client-tool-done', handle);
	}, [updateMessage, setWhenFinishedToolProps]);

	const findAgent = useCallback(
		async (options = {}) => {
			pushStatus('calling-agent');
			const { signal } = controller;
			const response = await withMinDuration(
				pickWorkflow({
					// A mid-turn drop clears the block after this closure was made.
					workflows: getAvailableWorkflows().map((w) => w.id),
					options: { signal, ...options },
				}).catch(async (error) => {
					devmode && console.error(error);
					if (error?.response?.status === 429) {
						updateRetryAfter(error?.response?.headers?.get('Retry-After'));
						setCanType(false);
						pushStatus('credits-exhausted');
						return;
					}
					setCanType(true);
					if (error === 'Workflow aborted') return;

					await new Promise((resolve) => setTimeout(resolve, 1000));
					addMessage('message', {
						role: 'assistant',
						// translators: This message is shown when the AI agent fails to find a suitable workflow.
						content: __(
							'Something went wrong while trying to start this request. Please try again.',
							'extendify-local',
						),
						error: true,
					});
					return;
				}),
				500,
			);
			if (!response || signal.aborted) return;

			const { workflow: wf, reply } = response;
			if (wf?.id) setWorkflow(wf);
			if (reply) {
				const data = { role: 'assistant', content: reply, agent: wf?.agent };
				addMessage('message', data);
			}
			if (!wf?.id) setCanType(true);
		},
		[
			addMessage,
			pushStatus,
			updateRetryAfter,
			setWorkflow,
			getAvailableWorkflows,
		],
	);

	// The backend caps tool runs; nothing here bounds the loop.
	const handleCanvasMessage = useCallback(async () => {
		setCanType(false);
		// cleanup() replaces the controller, so a cancel is lost between passes.
		const { signal } = controller;
		while (!signal.aborted) {
			pushStatus('agent-working');
			const response = await handleCanvas({
				toolId: whenFinishedToolProps?.id,
				sessionId: workflow?.sessionId,
				abilities: workflow?.abilities,
				options: { signal },
			}).catch((error) => {
				if (error === 'Workflow aborted') return null;
				const { sessionId } = workflow || {};
				digest({
					error,
					details: { source: 'agent', caller: 'handle-canvas', sessionId },
				});
				devmode && console.error(error);
				return { error: error.message };
			});
			// A request that settled before the abort still resolves with a reply.
			if (!response || signal.aborted) break;
			if (response.error) {
				addMessage('message', {
					role: 'assistant',
					// translators: Shown when the AI agent could not answer a question about the form it has open on screen.
					content: __(
						'Sorry, something went wrong. Please try asking again.',
						'extendify-local',
					),
					error: true,
				});
				break;
			}
			if (response.reply) {
				addMessage('message', {
					role: 'assistant',
					content: response.reply,
					followup: !!response.tool,
					agent: workflow?.agent,
				});
			}
			// The model is never told what is on screen around the canvas.
			if (response.cannotHelp && !canvasNoticeShown.current) {
				canvasNoticeShown.current = true;
				addMessage('canvas-notice', {});
			}
			if (!response.tool) break;
			const { id, inputs, labels } = response.tool;
			pushStatus('tool-started', labels?.started);
			const result = await callTool({
				tool: id,
				inputs,
				abilities: workflow?.abilities,
			}).catch((error) => {
				const { sessionId } = workflow || {};
				digest({
					error,
					details: { source: 'agent', caller: `canvas: ${id}`, sessionId },
				});
				console.error(`Extendify agent tool error: ${id}`, { siteId, error });
				return { error: { message: error?.message, code: error?.code } };
			});
			addMessage('tool', { id, inputs, result, label: labels?.confirm });
		}
		setCanType(true);
	}, [addMessage, pushStatus, whenFinishedToolProps, workflow]);

	const handleSubmit = useCallback(
		async (message, { hidden = false } = {}) => {
			// Suggestions reach the agent without the textarea; disabling it isn't enough.
			if (useQuickEditStore.getState().selected) return;
			setWaitingOnToolOrUser(false);
			agentWorking.current = false;
			addMessage('message', { role: 'user', content: message, hidden });

			// Without this a typed message would drop the workflow and close the canvas.
			if (canvasOpen && canvasAssist) return handleCanvasMessage();

			// A staged tool the user walked away from still owes its receipt.
			if (workflow?.id && whenFinishedToolProps?.id) {
				const { answerId, whenFinishedTool } =
					whenFinishedToolProps.agentResponse || {};
				addMessage('workflow', {
					status: 'canceled',
					label: whenFinishedTool?.labels?.cancel,
					agent: workflow.agent,
					workflowId: workflow.id,
					answerId,
					suggestions: getSuggestions(),
				});
			}

			// Let some phrases auto load workflows
			const bypass = getWorkflowByExample(message);
			if (bypass?.example?.agentResponse) {
				// whenFinishedTool → inline input UI; none → ask for a typed reply.
				return bypass.example.agentResponse.whenFinishedTool
					? handleBypass(bypass)
					: handleInstantAsk(bypass);
			}

			setCanType(false);
			// If they typed while waiting on a redirect, reset the workflow
			const redirect = workflow?.needsRedirect?.();
			// If they typed while an active whenFinished, reset the workflow
			const inWhenFinished = whenFinishedToolProps?.id;
			const removingWorkflow = redirect || inWhenFinished;
			if (removingWorkflow) setWorkflow(null);

			// They are in the middle of a workflow back and forth
			if (workflow && !removingWorkflow) {
				// Clone the workflow to let the effect handle it
				const wfData = workflowData || {};
				setWorkflow({ ...workflow });
				mergeWorkflowData(wfData);
				return;
			}

			// Skip the network find-agent when the staged block makes the edit certain.
			const localPick = localPickWorkflow({ block });
			if (localPick) {
				if (await canceledDuring(500)) return;
				setWorkflow(localPick);
				return;
			}

			await findAgent().catch((e) => devmode && console.error(e));
		},
		[
			addMessage,
			block,
			canvasAssist,
			canvasOpen,
			findAgent,
			handleCanvasMessage,
			mergeWorkflowData,
			whenFinishedToolProps,
			setWorkflow,
			workflow,
			workflowData,
			getAvailableWorkflows,
			getSuggestions,
		],
	);

	// Used to inject a workflow final state
	const handleBypass = useCallback(async (workflow) => {
		const agentResponse = workflow.example?.agentResponse;
		cleanup();
		if (!agentResponse) return;
		setWorkflow(workflow);
		setCanType(false);
		agentWorking.current = true;
		if (await canceledDuring(750)) return;
		addMessage('message', {
			role: 'assistant',
			content: agentResponse.reply,
		});
		setWhenFinishedToolProps({
			...agentResponse?.whenFinishedTool,
			agentResponse,
		});
		recordAgentActivity({
			sessionId: workflow?.sessionId,
			action: 'workflow_tool_bypass',
			value: { workflow: workflow?.id },
		});
	}, []);

	// Ask the user, then let the normal loop handle their typed reply.
	const handleInstantAsk = useCallback(async (workflow) => {
		const agentResponse = workflow.example?.agentResponse;
		cleanup();
		if (!agentResponse) return;
		setWorkflow(workflow);
		// Without this the loop calls the backend before the user has typed.
		setWaitingOnToolOrUser(true);
		setCanType(false);
		agentWorking.current = true;
		if (await canceledDuring(750)) return;
		addMessage('message', {
			role: 'assistant',
			content: agentResponse.reply,
			// A workflow example can carry its own suggestions; none still asks.
			qaSuggestions: agentResponse.qaSuggestions ?? [],
		});
		agentWorking.current = false;
		setCanType(true);
		recordAgentActivity({
			sessionId: workflow?.sessionId,
			action: 'workflow_instant_ask',
			value: { workflow: workflow?.id },
		});
	}, []);

	useEffect(() => {
		// Allow external messages to trigger the agent
		const handleMessage = ({ detail }) => {
			if (!detail?.message) return;
			handleSubmit(detail.message, { hidden: detail.hidden });
		};
		// Allow external code to clear the block and workflow
		const handleCleanup = () => {
			// cleanup() resets canType and agentWorking, so read them before it runs.
			const interrupted = agentWorking.current || !canType;
			controller.abort('Workflow aborted');
			cleanup();
			// Deferred a frame: the input stays disabled until the cancel lands.
			requestAnimationFrame(() =>
				document.querySelector('#extendify-agent-chat-textarea')?.focus(),
			);

			// An options panel can outlive its workflow; cancel must still clear it.
			if (!workflow?.id && !qaSuggestions && !interrupted) return;
			setWorkflow(null);
			addMessage('workflow', {
				status: 'canceled',
				agent: workflow?.agent,
				workflowId: workflow?.id,
				suggestions: getSuggestions(),
			});
			return;
		};
		window.addEventListener('extendify-agent:cancel-workflow', handleCleanup);
		window.addEventListener('extendify-agent:chat-submit', handleMessage);
		return () => {
			window.removeEventListener(
				'extendify-agent:cancel-workflow',
				handleCleanup,
			);
			window.removeEventListener('extendify-agent:chat-submit', handleMessage);
		};
	}, [
		handleSubmit,
		cleanup,
		setWorkflow,
		addMessage,
		workflow,
		qaSuggestions,
		getSuggestions,
		canType,
	]);

	// Dispatching before chat-submit has a listener drops the workflow.
	useEffect(() => {
		if (!startOnboardingWorkflow.available()) return;
		window.dispatchEvent(
			new CustomEvent('extendify-agent:chat-submit', {
				detail: { message: startOnboardingWorkflow.example.text, hidden: true },
			}),
		);
	}, []);

	// Handle whenFinished component confirm/cancel
	useEffect(() => {
		const handleConfirm = async ({ detail }) => {
			if (toolWorking.current) return;
			setWhenFinishedToolProps(null);
			toolWorking.current = true;
			const { data, whenFinishedToolProps, shouldRefreshPage, redirectUrl } =
				detail ?? {};
			const { whenFinishedTool, answerId, redirectTo } =
				whenFinishedToolProps?.agentResponse || {};
			const { id, labels } = whenFinishedTool || {};
			// Staged unanswered so its own component can show the run in progress.
			const runMessageId = id ? addMessage('tool', { id, inputs: data }) : null;
			if (!hasRunComponent(id)) pushStatus('workflow-tool-processing');
			// Not all workflows have a tool at the end (e.g. tours)
			const toolResponse = await callTool?.({ tool: id, inputs: data }).catch(
				(error) => {
					const { sessionId } = workflow || {};
					digest({
						error,
						details: {
							source: 'agent',
							caller: `when-finished: ${id}`,
							sessionId,
						},
					});
					console.error(`Extendify agent tool error: ${id}`, { siteId, error });
					return { error: { message: error?.message, code: error?.code } };
				},
			);
			toolWorking.current = false;
			if (runMessageId) updateMessage(runMessageId, { result: toolResponse });
			if (toolResponse?.refused) {
				await new Promise((resolve) => setTimeout(resolve, 1000));
				const refusalMessages = {
					// translators: Shown when the AI agent's edit produced no change to the block, which is unexpected.
					'no-op': __(
						"That edit came back unchanged, which wasn't expected. Please try rephrasing what you'd like to change.",
						'extendify-local',
					),
				};
				addMessage('message', {
					role: 'assistant',
					content:
						refusalMessages[toolResponse.reason] ??
						// translators: Shown when the AI agent could not safely apply an edit to the selected block.
						__(
							"I couldn't safely apply that edit to the selected block. Please re-select the block and try again.",
							'extendify-local',
						),
					error: true,
				});
				setWorkflow(null);
				cleanup();
				return;
			}
			// Only loop back on error, so the model can recover. A clean
			// whenFinished tool means the workflow is done.
			if (toolResponse?.error) {
				setWaitingOnToolOrUser(false);
				agentWorking.current = false;
				setLoop((prev) => prev + 1);
				return;
			}

			addSuggestions(whenFinishedToolProps.agentResponse?.recommendations);
			addMessage('workflow', {
				status: 'completed',
				label: labels?.confirm,
				agent: workflow.agent,
				workflowId: workflow.id,
				answerId,
				suggestions: getSuggestions(),
			});
			// A chat message persists, so the next turn's model knows the save was partial.
			const refusedCount = toolResponse?.refusedOperations?.length;
			if (refusedCount) {
				addMessage('message', {
					role: 'assistant',
					content: sprintf(
						// translators: %d is how many of the requested edits were not applied.
						_n(
							"Heads up — %d of those changes couldn't be applied. If something still looks the same, ask me to redo just that part.",
							"Heads up — %d of those changes couldn't be applied. If something still looks the same, ask me to redo just those parts.",
							refusedCount,
							'extendify-local',
						),
						refusedCount,
					),
				});
			}
			setWorkflow(null);
			useCanvasStore.getState().endSession();

			const url = getRedirectUrl(redirectTo, whenFinishedToolProps?.inputs);
			const refreshForAbility = isAbilityTool(id);
			if (url || redirectUrl || shouldRefreshPage || refreshForAbility) {
				return doReload(url || redirectUrl);
			}
			cleanup();
		};
		const handleCancel = ({ detail }) => {
			if (toolWorking.current) return;
			// Without this a canvas closed mid-turn keeps replying into the chat.
			controller.abort('Workflow aborted');
			const { answerId, whenFinishedTool } =
				detail.whenFinishedToolProps?.agentResponse || {};
			addMessage('workflow', {
				status: 'canceled',
				label: whenFinishedTool?.labels?.cancel,
				agent: workflow.agent,
				workflowId: workflow.id,
				answerId,
				suggestions: getSuggestions(),
			});
			setWorkflow(null);
			useCanvasStore.getState().endSession();
			cleanup();
		};
		const handleRetry = () => {
			popMessage();
			setWaitingOnToolOrUser(false);
			agentWorking.current = false;
			retrying.current = true;
			setLoop((prev) => prev + 1); // Trigger next loop
		};
		window.addEventListener('extendify-agent:workflow-confirm', handleConfirm);
		window.addEventListener('extendify-agent:workflow-cancel', handleCancel);
		window.addEventListener('extendify-agent:workflow-retry', handleRetry);
		return () => {
			window.removeEventListener(
				'extendify-agent:workflow-confirm',
				handleConfirm,
			);
			window.removeEventListener(
				'extendify-agent:workflow-cancel',
				handleCancel,
			);
			window.removeEventListener('extendify-agent:workflow-retry', handleRetry);
		};
	}, [
		addMessage,
		pushStatus,
		popMessage,
		cleanup,
		setWorkflow,
		workflow,
		getSuggestions,
		addSuggestions,
	]);

	useEffect(() => {
		const handleClose = () => setOpen(false);
		const handleOpen = () => setOpen(true);
		window.addEventListener('extendify-agent:close', handleClose);
		window.addEventListener('extendify-agent:open', handleOpen);
		return () => {
			window.removeEventListener('extendify-agent:close', handleClose);
			window.removeEventListener('extendify-agent:open', handleOpen);
		};
	}, [setOpen]);

	// Closing the sidebar dismisses any latent block selection. The X-close
	// indicator (in DOMHighlighter) only renders while the sidebar is open,
	// so leaving `block` set after close would let Quick Edit's hover-bar
	// gate fire on a selection the user can no longer see or clear.
	useEffect(() => {
		if (open) return;
		if (block) setBlock(null);
	}, [open, block, setBlock]);

	useEffect(() => {
		if (waitingOnToolOrUser || !open || !workflow?.id) return;
		// Some workflows require they dont change pages
		const theyMoved = workflow?.startingPage !== window.location.href;
		// Requires a block to be selected
		const blockMissing = !block && workflow?.requires?.includes('block');
		const cancelWorkflow =
			(workflow?.cancelOnPageChange && theyMoved) || blockMissing;
		if (cancelWorkflow) {
			addMessage('workflow', {
				status: 'canceled',
				agent: workflow.agent,
				workflowId: workflow.id,
				suggestions: getSuggestions(),
			});
			setWorkflow(null);
			cleanup();
			return;
		}
		// A component is running
		if (whenFinishedToolProps?.id) return;
		// They must be on a page where they can do work
		if (workflow?.needsRedirect?.()) {
			cleanup();
			return;
		}
		(async () => {
			if (agentWorking.current) return; // Prevent multiple calls
			if (toolWorking.current) return;
			setCanType(false);
			agentWorking.current = true;
			pushStatus('agent-working');
			const agentResponse = await handleWorkflow({
				workflow,
				workflowData,
				options: { signal: controller.signal, retry: retrying.current },
			}).catch((error) => {
				// handleCleanup already added the canceled message
				if (error === 'Workflow aborted') return;
				const { sessionId } = workflow || {};
				digest({
					error,
					details: { source: 'agent', caller: `handle-workflow`, sessionId },
				});
				devmode && console.error(error);
				return { error: error.message };
			});
			if (retrying.current) retrying.current = false;
			if (!agentResponse) return;
			const { answerId, sessionId } = agentResponse;
			if (!open) return;
			if (agentResponse.error) {
				// mutate the window to add failed tools rather than keep state
				window.extAgentData.failedWorkflows =
					window.extAgentData.failedWorkflows || new Set();
				window.extAgentData.failedWorkflows.add(workflow.id);
				throw new Error(`Error handling workflow: ${agentResponse.error}`);
			}
			// The ai sent back some text to show to the user
			const reply =
				agentResponse.reply ??
				(agentResponse.tool
					? getClientToolFallbackReply(agentResponse.tool.id)
					: null);
			if (reply) {
				addMessage('message', {
					role: 'assistant',
					content: reply,
					followup: !!agentResponse.tool,
					pageSuggestion: agentResponse.pageSuggestion,
					qaSuggestions: agentResponse.qaSuggestions,
					agent: workflow.agent,
					sessionId: workflow?.sessionId,
					workflowId: workflow?.id,
					language: workflow?.language,
				});
			}
			// Set when the request needs something no block edit can do.
			if (agentResponse.dropSelection) {
				setBlock(null);
				window.dispatchEvent(
					new Event('extendify-agent:remove-block-highlight'),
				);
				setWorkflow(null);
				pushStatus(
					'tool-started',
					// translators: Shown while the AI agent deselects a block that can't serve the request.
					__('Removing selected block', 'extendify-local'),
				);
				// findAgent pushes its own status right away; let this one read first.
				if (await canceledDuring(2500)) return;
				agentWorking.current = false;
				await findAgent();
				return;
			}
			// This is at the end of the workflow
			// and we are about to execute the final tool
			if (agentResponse.whenFinishedTool?.id) {
				setWhenFinishedToolProps({
					...agentResponse.whenFinishedTool,
					agentResponse,
				});
				// If static, add it as a message
				const { id, inputs, static: staticC } = agentResponse.whenFinishedTool;
				// A canvas workflow renders in the canvas and ends on close or submit.
				if (staticC && !workflow.whenFinished?.canvas) {
					addMessage('workflow-component', {
						id,
						status: 'completed',
						inputs,
						workflowId: workflow.id,
					});
					addSuggestions(agentResponse.recommendations);
					setWorkflow(null);
					addMessage('workflow', {
						status: 'completed',
						agent: workflow.agent,
						workflowId: workflow.id,
						answerId,
						suggestions: getSuggestions(),
					});
					cleanup();
				}
				return;
			}
			// If we're done, it means the AI has the answer
			if (agentResponse.status !== 'in-progress') {
				const { recommendations, status } = agentResponse;
				const isCompleted = status === 'completed';
				if (recommendations) addSuggestions(recommendations);
				setWorkflow(null);
				cleanup();
				addMessage('workflow', {
					status: isCompleted ? 'completed' : 'canceled',
					agent: workflow.agent,
					workflowId: workflow.id,
					answerId,
					suggestions: getSuggestions(),
				});
				return;
			}
			if (sessionId && sessionId !== workflow.sessionId) {
				// Session ID changed, update the workflow
				setWorkflow({ ...workflow, sessionId });
			}
			// These inputs are filled out by the AI
			mergeWorkflowData(agentResponse.inputs);
			// Agent needs more info from a
			if (agentResponse.tool) {
				const { id, inputs, labels } = agentResponse.tool;
				// A client tool is answered by in-chat UI, so the turn ends here.
				if (getClientTools().includes(id)) {
					addMessage('tool', { id, inputs });
					// Clearing agentWorking here fires a second turn: the wait flag
					// has not committed yet.
					setWaitingOnToolOrUser(true);
					setCanType(false);
					return;
				}
				pushStatus('tool-started', labels?.started);
				const toolData = await Promise.all([
					callTool({ tool: id, inputs }),
					new Promise((resolve) => setTimeout(resolve, 3000)),
				])
					.then(([data]) => data)
					.catch((error) => {
						const { sessionId } = workflow || {};
						digest({
							error,
							details: {
								source: 'agent',
								caller: `in-progress: ${id}`,
								sessionId,
							},
						});
						console.error(`Extendify agent tool error: ${id}`, {
							siteId,
							error,
						});
						// Don't throw; the loop hands the error to the model.
						return { error: { message: error?.message, code: error?.code } };
					});
				// do-when-finished spreads first-class workflowData into the tool.
				if (!toolData?.error && !isAbilityWorkflow(workflow.id)) {
					mergeWorkflowData(toolData);
				}
				if (toolData?.stagedBlockIds?.length) requireBlock();
				addMessage('tool', {
					id,
					inputs,
					result: toolData,
					label: labels?.confirm,
				});
				setWaitingOnToolOrUser(false);
				agentWorking.current = false;
				setLoop((prev) => prev + 1); // Trigger next loop
				return;
			}
			setCanType(true);
			setWaitingOnToolOrUser(true);
		})().catch(async (error) => {
			const { sessionId } = workflow || {};
			digest({
				error,
				details: { source: 'agent', caller: 'main-loop', sessionId },
			});
			devmode && console.error(error);
			setWorkflow(null);
			cleanup();
			await new Promise((resolve) => setTimeout(resolve, 1000));
			addMessage('message', {
				role: 'assistant',
				// translators: This message is shown when the AI agent encounters a general error.
				content: __(
					"Sorry, something went wrong. I tried but wasn't able to do this request. Please try again.",
					'extendify-local',
				),
				error: true,
			});
		});
	}, [
		loop,
		cleanup,
		open,
		workflow,
		workflowData,
		addMessage,
		pushStatus,
		setWorkflow,
		agentWorking,
		waitingOnToolOrUser,
		mergeWorkflowData,
		requireBlock,
		canType,
		whenFinishedToolProps,
		setWhenFinishedToolProps,
		block,
		setBlock,
		findAgent,
		addSuggestions,
		getSuggestions,
	]);

	useEffect(() => {
		if (!canType) return;
		document.querySelector('#extendify-agent-chat-textarea')?.focus();
	}, [canType]);

	const busy = !canType || !chatAvailable || workflow?.id;
	// `busy` is true at rest; 429 is blocked, not working.
	const working = !canType && chatAvailable;

	return (
		<>
			<Canvas />
			<Chat busy={busy} working={working}>
				<div className="relative z-50 flex h-full flex-col justify-between overflow-auto">
					<ChatMessages
						redirectComponent={
							workflow?.needsRedirect?.() ? workflow.redirectComponent : null
						}
					/>
					<div>
						<div className="relative flex flex-col px-4 pb-2 pt-2.5 shadow-lg-flipped">
							<UsageMessage
								onReady={() => {
									cleanup();
									pushStatus('credits-restored');
								}}
							/>
						</div>
						<div className="p-4 pb-2 pt-0">
							<ChatInput
								disabled={
									!canType || !chatAvailable || !!qaSuggestions || leavingPage
								}
								handleSubmit={handleSubmit}
							/>
						</div>
						<div className="text-pretty px-4 pb-2 text-center text-xss leading-none text-gray-700">
							{__(
								'AI Agent can make mistakes. Check changes before saving.',
								'extendify-local',
							)}
						</div>
					</div>
				</div>
			</Chat>
		</>
	);
};
