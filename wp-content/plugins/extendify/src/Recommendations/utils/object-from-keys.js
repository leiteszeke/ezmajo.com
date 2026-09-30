// Accepts an object and a list of selected keys
// and returns a new object with only the selected keys.
export const objectFromKeys = (sourceObject, selectedKeys) =>
	Object.entries(sourceObject)
		.filter(([key]) => selectedKeys.includes(key))
		.reduce((acc, [key, value]) => {
			acc[key] = value;
			return acc;
		}, {});
