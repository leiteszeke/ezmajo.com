import apiFetch from '@wordpress/api-fetch';

// The feed has no positive marker for an in-place CTA, only the trigger.
const ACTIONS = {
	unpublished: '/extendify/v1/site-visibility/publish',
	'search-engine-block': '/extendify/v1/search-indexing/enable',
};

export const ctaActionFor = (notification) =>
	ACTIONS[notification?.trigger] ?? null;

export const runCtaAction = (path, onClick) => {
	onClick();
	// Reload on failure too: the saved option decides what renders, not this click.
	return apiFetch({ path, method: 'POST' }).finally(() =>
		window.location.reload(),
	);
};
