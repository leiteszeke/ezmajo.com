export const removeAnimationClasses = (el) => {
	if (!el) return null;

	const classes = ['ext-animate', 'ext-animate--on'];

	// Clone to not mutate live DOM
	const clone = el.cloneNode(true);

	// Remove animation classes since they're not needed in the preview
	clone.classList.remove(...classes);
	clone
		.querySelectorAll(classes.map((className) => `.${className}`).join(', '))
		.forEach((node) => {
			node.classList.remove(...classes);
		});

	return clone;
};
