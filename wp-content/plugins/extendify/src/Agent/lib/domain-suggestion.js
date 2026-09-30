import { createDomainUrlLink } from '@assist/lib/domains';
import { safeParseJson } from '@shared/lib/parsing';
import { decodeEntities } from '@wordpress/html-entities';

export const REGISTER_DOMAIN_ID = 'register-domain';

const { hostname } = window.location;
const { devbuild, siteTitle, wpLanguage } = window.extSharedData;
const { showPrimary, showSecondary, stagingSites, searchUrl } =
	window.extAgentData?.domainsSuggestionSettings || {};

const parsedDomains = safeParseJson(window.extSharedData.resourceData)?.domains;
const domains = Array.isArray(parsedDomains) ? parsedDomains : [];
export const domain = domains[0] || '';

const isStagingDomain = (stagingSites || []).some((l) =>
	hostname.toLowerCase().includes(l),
);

const domainByLanguage = (lang, urlList) => {
	try {
		const urls = JSON.parse(decodeEntities(urlList));
		return urls?.[lang] ?? urls?.default ?? false;
	} catch (_e) {
		return decodeEntities(urlList) || false;
	}
};

const domainSearchUrl =
	devbuild && !searchUrl
		? 'https://extendify.com?s={DOMAIN}'
		: domainByLanguage(wpLanguage, searchUrl);

const canRecommendDomain = (enabled, requireStaging) => {
	if (devbuild) return true;
	if (!enabled) return false;
	if (!domain) return false;
	if (!siteTitle) return false;
	return requireStaging ? isStagingDomain : !isStagingDomain;
};

const showPrimaryDomainRecommendationAgent = canRecommendDomain(
	showPrimary,
	true,
);
const showSecondaryDomainRecommendationAgent = canRecommendDomain(
	showSecondary,
	false,
);

export const domainType = showPrimaryDomainRecommendationAgent
	? 'primary'
	: 'secondary';

export const isDomainRegistrationActive =
	(showPrimaryDomainRecommendationAgent ||
		showSecondaryDomainRecommendationAgent) &&
	Boolean(domain) &&
	Boolean(domainSearchUrl);

const rawSuggestion = (window.extAgentData?.suggestions || []).find(
	(s) => s.id === REGISTER_DOMAIN_ID,
);
export const REGISTER_DOMAIN_MESSAGE =
	isDomainRegistrationActive && typeof rawSuggestion?.message === 'string'
		? rawSuggestion.message.replace(/\{\{domain\}\}/g, domain)
		: '';

export const enhanceDomainSuggestion = (suggestion) => {
	if (suggestion?.id !== REGISTER_DOMAIN_ID) return suggestion;
	if (!isDomainRegistrationActive) return null;
	return {
		...suggestion,
		// The BE marks this as an external link; fall back in case it hasn't yet.
		type: suggestion.type ?? 'external-link',
		message: REGISTER_DOMAIN_MESSAGE,
		url: createDomainUrlLink(domainSearchUrl, domain),
		tracking: { domain, position: 'agent-suggestion', type: domainType },
	};
};
