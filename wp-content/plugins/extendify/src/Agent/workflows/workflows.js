const workflowContext = require.context(
	'.',
	true,
	// Anything not excluded here ships to find-agent as an eligible workflow.
	/^(?!.*\/(tools|components|overrides)\/)(?!\.\/workflows\.js$).*\.js$/,
);
export const workflows = workflowContext
	.keys()
	.filter((key) => key !== './workflows.js')
	.map((key) => workflowContext(key).default || workflowContext(key));

// Merged over the workflow the backend sent, never offered to find-agent.
const abilityContext = require.context(
	'.',
	true,
	/abilities\/overrides\/.*\.js$/,
);
export const abilityWorkflows = Object.fromEntries(
	abilityContext.keys().map((key) => {
		const workflow = abilityContext(key).default || abilityContext(key);
		return [workflow.id, workflow];
	}),
);

// Dynamically pull in all tools
const toolContext = require.context('.', true, /tools\/.*\.js$/);
export const tools = toolContext.keys().reduce((acc, key) => {
	const id = key.split('/').pop().replace('.js', '');
	acc[id] = toolContext(key).default || toolContext(key);
	return acc;
}, {});
