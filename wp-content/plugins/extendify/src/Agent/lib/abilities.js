// Ability workflows are synthesized per-request by the backend under a
// `wp-ability:` id prefix, so they carry no static workflow definition.
export const isAbilityWorkflow = (id) =>
	typeof id === 'string' && id.startsWith('wp-ability:');

// Confirmed abilities are writes, and nothing else re-renders what they changed.
export const isAbilityTool = (id) =>
	(window.extAgentData?.wpAbilities ?? []).some((category) =>
		category.abilities?.some((ability) => ability.name === id),
	);
