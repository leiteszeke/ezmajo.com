export const clamp = (value, min, max) => Math.max(min, Math.min(value, max));

export const makeId = () =>
	Date.now().toString(36) + Math.random().toString(36).slice(2);

export const isInEditor = () => {
	const path = window.location.pathname;
	const params = new URLSearchParams(window.location.search);
	return path.includes('/wp-admin/post.php') && params.get('action') === 'edit';
};

export const isChangeSiteDesignWorkflowAvailable = () => {
	const { useAgentOnboarding } = window.extSharedData;

	return useAgentOnboarding;
};
