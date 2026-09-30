// A dependency that merely wasn't loaded yet clears on a second pass.
export const failedDependencies = (patterns) =>
	patterns
		.filter((p) => p.pluginDependencyFailed)
		.map((p) => p.pluginDependency);

export const processWithSecondPass = async (process, patterns) => {
	const processed = await process(patterns).catch(() => null);
	if (processed && !failedDependencies(processed).length) return processed;

	const retried = await process(patterns).catch(() => null);
	return retried ?? processed ?? patterns;
};
