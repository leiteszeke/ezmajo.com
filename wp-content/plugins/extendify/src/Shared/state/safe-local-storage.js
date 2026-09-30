export const safeLocalStorage = {
	getItem: (name) => localStorage.getItem(name),
	setItem: (name, value) => {
		try {
			localStorage.setItem(name, value);
		} catch (e) {
			console.warn('Extendify: could not persist to localStorage', e);
			// TODO: Consider using a fallback like IndexedDB or the user's backend.
		}
	},
	removeItem: (name) => localStorage.removeItem(name),
};
