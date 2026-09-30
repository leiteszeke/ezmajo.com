import apiFetch from '@wordpress/api-fetch';

// The feed has no positive marker for a publish CTA, only this trigger.
export const publishesSite = (notification) =>
	notification?.trigger === 'unpublished';

export const publishSite = () =>
	apiFetch({
		path: '/extendify/v1/site-visibility/publish',
		method: 'POST',
	});

export const publishAndReload = (onClick) => {
	onClick();
	// Reload on failure too: the saved option decides visibility, not this click.
	return publishSite().finally(() => window.location.reload());
};
