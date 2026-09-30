import { abilityDescriptors, getAbilities } from '@agent/abilities/abilities';
import { findBlockEl, scopeOf } from '@agent/lib/block-el';
import { buildBlockSchema } from '@agent/lib/block-schema';
import {
	classifyBlockEdit,
	IGNORED_BLOCKS,
} from '@agent/lib/classify-block-edit';
import { getClientTools } from '@agent/lib/client-tools';
import { isExtendableHeader } from '@agent/lib/extendable-header';
import { INSERTABLE_BLOCK_TYPES } from '@agent/lib/insertable-blocks';
import { ensureCoreBlocksRegistered } from '@agent/lib/register-blocks';
import {
	buildSubtreeManifest,
	buildSubtreeTree,
} from '@agent/lib/subtree-manifest';
import { activeCanvasStep } from '@agent/state/canvas';
import { useChatStore } from '@agent/state/chat';
import { useGlobalStore } from '@agent/state/global';
import { tools } from '@agent/workflows/workflows';
import { AI_HOST } from '@constants';
import { useQuickEditStore } from '@quick-edit/state/store';
import { digest } from '@shared/api/digest';
import { reqDataBasics } from '@shared/lib/data';
import { getBlockType } from '@wordpress/blocks';

// page-templates:v1 declares that find-blocks and stage-block reach into parts.
export const API_FEATURES = ['qa-tool', 'page-templates:v1'];

const rootFor = (block) =>
	block?.id && block?.target
		? findBlockEl(block.id, document, scopeOf(block))
		: null;

// If greater than 5 blocks the agent will narrow the scope
const EAGER_LOAD_MAX = 5;

// The staged selection's attribute schemas, with the install's palette baked in.
export const blockSchemasFor = async (block) => {
	const root = rootFor(block);
	const { bucket } = classifyBlockEdit({ block, root });
	const types =
		bucket === 'single'
			? [block.blockType]
			: IGNORED_BLOCKS.has(block?.blockType)
				? []
				: [...new Set(buildSubtreeManifest(root).map(({ type }) => type))];
	if (!types.length || types.length > EAGER_LOAD_MAX) return [];
	await ensureCoreBlocksRegistered();
	return types
		.map((type) => ({ type, schema: buildBlockSchema(getBlockType(type)) }))
		.filter(({ schema }) => schema);
};

// Only consumed for a multi-block edit; inert for single/combo.
export const subtreeManifestFor = (block) =>
	buildSubtreeManifest(rootFor(block));

// Selection hierarchy for the backend's positional edits.
export const subtreeTreeFor = (block) => buildSubtreeTree(rootFor(block));

const extra = () => {
	const { x, y, width, height } = useGlobalStore.getState();
	return {
		userAgent: window?.navigator?.userAgent,
		vendor: window?.navigator?.vendor || 'unknown',
		platform:
			window?.navigator?.userAgentData?.platform ||
			window?.navigator?.platform ||
			'unknown',
		mobile: window?.navigator?.userAgentData?.mobile,
		width: window.innerWidth,
		height: window.innerHeight,
		screenHeight: window.screen.height,
		screenWidth: window.screen.width,
		orientation: window.screen.orientation?.type,
		touchSupport: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
		agentUI: { x, y, width, height },
	};
};

export const pickWorkflow = async ({ workflows, options }) => {
	const { failedWorkflows, context } = window.extAgentData;
	const failed = failedWorkflows ?? new Set();
	const filteredWorkflows = workflows.filter((wf) => !failed.has(wf.id));

	const block = useQuickEditStore.getState().agentBlock;

	const messages = useChatStore
		.getState()
		.getCurrentMessages({ includeTools: false });
	const lastAssistantMessage = useChatStore
		.getState()
		.getLastAssistantMessage();

	const response = await fetch(`${AI_HOST}/api/agent/find-agent`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		signal: options?.signal,
		body: JSON.stringify({
			...reqDataBasics,
			workflows: filteredWorkflows,
			previousWorkflow: {
				workflowId: lastAssistantMessage?.details?.workflowId,
				language: lastAssistantMessage?.details?.language,
				lastMessage: lastAssistantMessage?.details?.content,
				sessionId: lastAssistantMessage?.details?.sessionId,
			},
			context,
			agentContext: window.extAgentData.agentContext,
			wpAbilities: window.extAgentData.wpAbilities ?? [],
			clientTools: getClientTools(),
			messages: messages.slice(-5),
			hasBlock: Boolean(block), // todo: remove this
			blockDetails: block,
			features: API_FEATURES,
			...options,
			extra: extra(),
		}),
	});

	if (!response.ok) {
		digest({
			error: {
				name: response.statusText,
				messages: response.statusMessage,
			},
			details: { source: 'agent', caller: 'pick-workflow' },
		});
		const error = new Error('Bad response from server');
		error.response = response;
		throw error;
	}
	return await response.json();
};

export const handleWorkflow = async ({ workflow, workflowData, options }) => {
	const { getCurrentMessages, getMessagesFor } = useChatStore.getState();
	const block = useQuickEditStore.getState().agentBlock;
	const isBlockPatching =
		workflow?.id === 'block-patching' ||
		(workflow?.id === 'select-block' && Boolean(block));
	// Spent once the manifest flows: patching never reads this workflow's inputs.
	const { blockSearch: _spent, ...carried } = workflowData ?? {};
	// Schemas: pinned up front when the selection is small enough; otherwise
	// empty until get-block-schemas fetches them into the same field.
	const data = isBlockPatching
		? {
				...carried,
				blockSchemas: workflowData?.blockSchemas?.length
					? workflowData.blockSchemas
					: await blockSchemasFor(block),
			}
		: workflowData;
	const response = await fetch(`${AI_HOST}/api/agent/handle-workflow`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		signal: options?.signal,
		body: JSON.stringify({
			...reqDataBasics,
			workflow,
			workflowData: data,
			messages: getCurrentMessages(),
			previousMessages: getMessagesFor(workflow?.id),
			context: window.extAgentData.context,
			agentContext: window.extAgentData.agentContext,
			wpAbilities: window.extAgentData.wpAbilities ?? [],
			clientTools: getClientTools(),
			// The manifest is the backend's block-patching signal — never send it
			// for other workflows or they'd be routed into the patching handler.
			blockManifest: isBlockPatching ? subtreeManifestFor(block) : [],
			blockTree: isBlockPatching ? subtreeTreeFor(block) : [],
			// The plugin owns the add catalog so old fielded builds are never
			// offered a type they can't build.
			insertableBlockTypes: isBlockPatching ? INSERTABLE_BLOCK_TYPES : [],
			// The patcher writes dead CSS for these switches and claims success.
			isExtendableHeader:
				isBlockPatching && block?.template === 'header' && isExtendableHeader(),
			retry: options?.retry || false,
			features: API_FEATURES,
			extra: extra(),
		}),
	});

	if (!response.ok) throw new Error('Bad response from server');
	return await response.json();
};

export const handleCanvas = async ({
	toolId,
	sessionId,
	abilities,
	options,
}) => {
	const { getCurrentMessages, getMessagesFor } = useChatStore.getState();
	const { values } = activeCanvasStep();
	const response = await fetch(`${AI_HOST}/api/agent/handle-canvas`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		signal: options?.signal,
		body: JSON.stringify({
			...reqDataBasics,
			toolId,
			values,
			abilities: abilityDescriptors(getAbilities(abilities)),
			messages: getCurrentMessages(),
			previousMessages: getMessagesFor(toolId),
			context: window.extAgentData.context,
			sessionId,
			extra: extra(),
		}),
	});

	if (!response.ok) throw new Error('Bad response from server');
	return await response.json();
};

export const rateAnswer = ({ answerId, rating }) =>
	fetch(`${AI_HOST}/api/agent/rate-workflow`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ answerId, rating }),
	}).catch((error) =>
		digest({
			error: error,
			details: { source: 'agent', caller: 'rateAnswer', answerId, rating },
		}),
	);

// An error with no message serializes to {}, which the model reads as an empty success.
const reasonFor = async (error) => {
	// An unparsed apiFetch rejects with the Response, whose body holds the reason.
	if (typeof error?.json === 'function') {
		const body = await error.json().catch(() => null);
		return body?.message ?? `The site answered ${error.status}.`;
	}

	return (
		error?.error ?? error?.message ?? 'The ability failed without saying why.'
	);
};

// A throw would reach the model outside the tool's slot, reading as no result.
const runAbility = async (ability, inputs) => {
	try {
		return await ability.execute(inputs);
	} catch (error) {
		return { error: await reasonFor(error) };
	}
};

export const callTool = async ({ tool, inputs, abilities = [] }) => {
	if (tools[tool]) return await tools[tool](inputs);
	// Ours wins a name collision, so a duplicate WP ability can't change what runs.
	const ours =
		getAbilities(abilities).find(({ name }) => name === tool) ??
		getAbilities([tool])[0];
	if (ours) return { [tool]: await runAbility(ours, inputs) };
	// Ability tools are named after the ability and have no file; the generic
	// runner executes them. Key the result to its slot so the loop sees it filled.
	const isAbility = (window.extAgentData?.wpAbilities ?? []).some((category) =>
		category.abilities?.some((ability) => ability.name === tool),
	);
	if (isAbility) {
		return {
			[tool]: await tools['execute-ability']({ ability: tool, input: inputs }),
		};
	}
	throw new Error(`Tool ${tool} not found`);
};

export const recordAgentActivity = ({ action, sessionId, value = {} }) => {
	return fetch(`${AI_HOST}/api/agent/activities`, {
		keepalive: true,
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			...reqDataBasics,
			action,
			sessionId,
			value,
		}),
	});
};
