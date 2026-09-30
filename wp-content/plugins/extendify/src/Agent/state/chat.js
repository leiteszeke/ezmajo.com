import { buildToolMessages } from '@agent/lib/tool-messages';
import { makeId } from '@agent/lib/util';
import { useStatusStore } from '@agent/state/status';
import apiFetch from '@wordpress/api-fetch';
import { create } from 'zustand';
import { createJSONStorage, devtools, persist } from 'zustand/middleware';

const { chatHistory } = window.extAgentData;

const state = (set, get) => ({
	messages: chatHistory?.length ? chatHistory.toReversed() : [],
	// API messages, back to the last finished workflow.
	getCurrentMessages: ({ includeTools = true } = {}) => {
		const messages = [];
		let foundUserMessage = false;
		for (const { type, details } of get().messages.toReversed()) {
			const finished = ['completed', 'canceled'].includes(details.status);
			if (type === 'workflow' && finished) break;
			if (type === 'workflow-component' && finished) break;
			if (type === 'message' && details.error) break;
			// A call with no result leaves the model answering a phantom.
			if (type === 'tool' && !('result' in details)) continue;
			if (type === 'tool' && includeTools) {
				// buildToolMessages returns [call, result]; push reversed so the
				// final toReversed() restores call-before-result order.
				for (const m of buildToolMessages(details).toReversed())
					messages.push(m);
			}
			// This prevents a loop of assistant messages from being at the end
			if (type === 'message' && details.role === 'user') {
				foundUserMessage = true;
			}
			if (type === 'message' && !foundUserMessage) continue;
			if (type === 'message') messages.push(details);
		}
		return messages.toReversed();
	},
	// Most recent consecutive runs — another workflow in between resets the
	// memory.
	getMessagesFor: (workflowId) => {
		if (!workflowId) return [];
		const segments = [];
		let segment = [];
		for (const { type, details } of get().messages) {
			const finished = ['completed', 'canceled'].includes(details.status);
			if (['workflow', 'workflow-component'].includes(type) && finished) {
				segments.push({ workflowId: details.workflowId, segment });
				segment = [];
				continue;
			}
			// An error ended a run without a marker; what precedes it is dead.
			if (type === 'message' && details.error) {
				segment = [];
				continue;
			}
			if (type === 'tool' && 'result' in details) {
				segment.push(...buildToolMessages(details, { summarize: true }));
				continue;
			}
			if (type === 'message') segment.push(details);
		}
		const broken = segments.findLastIndex(
			(finished) => finished.workflowId !== workflowId,
		);
		return segments.slice(broken + 1).flatMap(({ segment }) => segment);
	},
	getLastAssistantMessage: () =>
		get()?.messages?.findLast(
			(message) =>
				message.type === 'message' && message.details?.role === 'assistant',
		),
	hasMessages: () => get().messages.length > 0,
	addMessage: (type, details) => {
		const id = makeId();
		set((state) => {
			// max 250 messages
			const max = Math.max(0, state.messages.length - 249);
			const next = { id, type, details };
			return {
				// { id: 1, type: message, details: { role: 'user', content: 'Hello' } }
				// { id: 2, type: message, details: { role: 'assistant', content: 'Hi there!' } }
				// { id: 3, type: workflow, details: { name: 'Workflow 1' } }
				messages: [...state.messages.toSpliced(0, max), next],
			};
		});
		// A real message supersedes any in-flight progress status.
		useStatusStore.getState().clearStatuses();
		return id;
	},
	updateMessage: (id, details) =>
		set((state) => ({
			messages: state.messages.map((message) =>
				message.id === id
					? { ...message, details: { ...message.details, ...details } }
					: message,
			),
		})),
	// pop messages all the way back to the last agent message
	popMessage: () => {
		set((state) => ({
			messages: state.messages?.slice(0, -1) || [],
		}));
	},
	clearMessages: () => set({ messages: [] }),
});

const path = '/extendify/v1/agent/chat-events';
let lastSave = Promise.resolve();
const storage = {
	getItem: async () => await apiFetch({ path }),
	setItem: (_name, state) => {
		lastSave = apiFetch({ path, method: 'POST', data: { state } });
		return lastSave;
	},
};

// Await before navigating — an aborted in-flight save loses the newest messages.
export const flushChatStorage = (timeout = 5000) =>
	Promise.race([
		lastSave.catch(() => null),
		new Promise((resolve) => setTimeout(resolve, timeout)),
	]);

export const useChatStore = create()(
	persist(devtools(state, { name: 'Extendify Agent Chat' }), {
		name: `extendify-agent-chat-${window.extSharedData.siteId}`,
		storage: createJSONStorage(() => storage),
		skipHydration: true,
	}),
);
