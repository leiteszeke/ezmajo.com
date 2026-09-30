export const safeParseJson = (json, fallback = {}) => {
	if (typeof json !== 'string') {
		return json ?? fallback;
	}
	try {
		return JSON.parse(json) ?? fallback;
	} catch (_e) {
		return fallback;
	}
};
