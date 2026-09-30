import { makeId } from '@agent/lib/util';

// Providers reject a tool/function name with characters outside this set, and
// ability ids are namespaced with a slash (e.g. woocommerce/products-query).
export const toolName = (id) => id.replace(/[^a-zA-Z0-9_.-]/g, '_');

// blockSchemas reaches the backend via workflowData; in the transcript it's static
// metadata re-read every turn. Serialize-time so persisted events come out clean too.
const trimResult = (result) => {
	if (!result || typeof result !== 'object') return result ?? null;
	const { blockSchemas: _, ...rest } = result;
	return rest;
};

// Values go stale between runs; ids don't. Keep error or stripFailedToolRuns
// can't spot a failure.
const summarizeResult = (result) => {
	if (!result || typeof result !== 'object') return result ?? null;
	return Object.fromEntries(
		Object.entries(result).filter(
			([key]) => key === 'error' || /^id$|_id$|Id$/.test(key),
		),
	);
};

// The provider rejects a tool result unless it's paired with an assistant
// tool-call sharing its id, so emit both.
export const buildToolMessages = (
	{ id, inputs, result },
	{ summarize = false } = {},
) => {
	const toolCallId = makeId();
	const name = toolName(id);
	return [
		{
			role: 'assistant',
			content: [
				{ type: 'tool-call', toolCallId, toolName: name, input: inputs ?? {} },
			],
		},
		{
			role: 'tool',
			content: [
				{
					type: 'tool-result',
					toolCallId,
					toolName: name,
					output: {
						type: 'json',
						value: summarize ? summarizeResult(result) : trimResult(result),
					},
				},
			],
		},
	];
};
