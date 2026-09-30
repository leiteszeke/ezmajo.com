import apiFetch from '@wordpress/api-fetch';
import { __, sprintf } from '@wordpress/i18n';
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

const storage = {
	setItem: (_name, store) =>
		apiFetch({
			path: '/extendify/v1/shared/update-user-meta',
			method: 'POST',
			data: { option: 'ai_consent', value: store.state.userGaveConsent },
		}),
};

export const defaultConsentTerms = sprintf(
	// translators: %1$s and %2$s are opening and closing anchor tags.
	__(
		'By using AI features, you agree with the %1$sTerms of Use and Privacy Policy%2$s.',
		'extendify-local',
	),
	'<a href="https://hosting-ai-terms.com/" target="_blank">',
	'</a>',
);

const state = (set, get) => ({
	showAIConsent: window.extSharedData?.showAIConsent ?? false,
	consentTerms: window.extSharedData?.consentTermsCustom || defaultConsentTerms,
	userGaveConsent: window.extSharedData?.userGaveConsent ?? false,
	setUserGaveConsent: (userGaveConsent) => set({ userGaveConsent }),
	// Context refers to the feature where the function is being used.
	shouldShowAIConsent: (context) => {
		const { showAIConsent, consentTerms, userGaveConsent } = get();
		const enabled = showAIConsent && consentTerms;
		const display = {
			launch: enabled,
			draft: enabled && !userGaveConsent,
			'help-center': enabled && !userGaveConsent,
		};
		return display?.[context] ?? false;
	},
});

export const useAIConsentStore = create(
	persist(devtools(state, { name: 'Extendify AI Consent' }), {
		name: 'extendify-ai-consent',
		storage,
		skipHydration: true,
	}),
);
