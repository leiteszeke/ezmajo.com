export const hasCSSVar = (varName, cssRules = []) => {
	return Array.from(cssRules).some((rule) => {
		if (!rule.style) return false;
		return Array.from(rule.style).some((style) => style?.includes(varName));
	});
};
