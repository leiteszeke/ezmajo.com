// A block entering on scroll measures where the animation starts.
export const whenAnimationsSettle = (el, onSettled) => {
	const running = el?.getAnimations?.({ subtree: true }) ?? [];
	if (!running.length) return () => {};
	let dropped = false;
	Promise.all(running.map((animation) => animation.finished))
		.then(() => !dropped && onSettled())
		// A cancelled animation rejects, and means nothing landed to re-measure.
		.catch(() => {});
	return () => {
		dropped = true;
	};
};
