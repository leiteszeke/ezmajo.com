import { __ } from '@wordpress/i18n';

// Collapses any Quick Edit save/load error into a user-facing message. The raw
// err.message still flows to insights via track() — only the displayed string
// is generalized. An expired REST nonce gets its own copy because "try again"
// is wrong advice: the page has to be refreshed to mint a fresh nonce.
export const friendlyMessage = (err) => {
	if (err?.body?.code === 'rest_cookie_invalid_nonce') {
		return __(
			'Your session expired. Please refresh the page and try again.',
			'extendify-local',
		);
	}
	return __(
		'Sorry, something went wrong. Please try again or try editing something else.',
		'extendify-local',
	);
};
