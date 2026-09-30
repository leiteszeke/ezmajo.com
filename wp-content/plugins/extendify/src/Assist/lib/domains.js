import { safeParseJson } from '@shared/lib/parsing';
import apiFetch from '@wordpress/api-fetch';
import { decodeEntities } from '@wordpress/html-entities';

const { hostname } = window.location;
const { devbuild, siteTitle, wpLanguage } = window.extSharedData;
const {
	showBanner,
	showTask,
	searchUrl,
	showSecondaryBanner,
	showSecondaryTask,
	stagingSites,
} = window.extAssistData?.domainsSuggestionSettings || {};

const parsedDomains = safeParseJson(window.extSharedData.resourceData)?.domains;
export const domains = Array.isArray(parsedDomains) ? parsedDomains : [];

const hasDomains = domains.length > 0;

const domainByLanguage = (lang, urlList) => {
	try {
		const urls = JSON.parse(decodeEntities(urlList));
		return urls?.[lang] ?? urls?.default ?? false;
	} catch (_e) {
		return decodeEntities(urlList) || false;
	}
};

export const domainSearchUrl =
	devbuild && !searchUrl
		? 'https://extendify.com?s={DOMAIN}'
		: domainByLanguage(wpLanguage, searchUrl);

const isStagingDomain = (stagingSites || []).some((l) =>
	hostname.toLowerCase().includes(l),
);

// Show if it's not a staging domain, has a title, and is enabled
export const showDomainBanner = (() => {
	if (devbuild) return true;
	if (!showBanner) return false;
	if (!hasDomains) return false;
	if (!siteTitle) return false;
	return isStagingDomain;
})();

// Show if it's not a staging domain, has a title, and is enabled
export const showDomainTask = (() => {
	if (devbuild) return true;
	if (!showTask) return false;
	if (!hasDomains) return false;
	if (!siteTitle) return false;
	return isStagingDomain;
})();

// Show if it's a staging domain, has a title, and is enabled
export const showSecondaryDomainBanner = (() => {
	if (devbuild) return true;
	if (!showSecondaryBanner) return false;
	if (!hasDomains) return false;
	if (!siteTitle) return false;
	return !isStagingDomain;
})();

// Show if it's a staging domain, has a title, and is enabled
export const showSecondaryDomainTask = (() => {
	if (devbuild) return true;
	if (!showSecondaryTask) return false;
	if (!hasDomains) return false;
	if (!siteTitle) return false;
	return !isStagingDomain;
})();

/**
 * The domainSearchUrl may contain both {SLD} and {TLD} placeholders
 * e.g., https://example.com?sld={SLD}&tld={TLD}
 * If not present, fallback to {DOMAIN} format
 */
export const createDomainUrlLink = (domainSearchUrl, domain) => {
	if (domainSearchUrl.includes('{SLD}') && domainSearchUrl.includes('{TLD}')) {
		const parts = domain.toLowerCase().split('.');
		const sld = parts[0];
		const tld = parts.slice(1).join('.');
		return domainSearchUrl.replace('{SLD}', sld).replace('{TLD}', `.${tld}`);
	}
	return domainSearchUrl.replace('{DOMAIN}', domain.toLowerCase());
};

export const deleteDomainCache = () =>
	apiFetch({
		path: 'extendify/v1/assist/delete-domains-recommendations',
		method: 'POST',
	});

export const buildDomainViewItems = (domains) =>
	domains.map((domain, i) => ({
		domain,
		type: i === 0 ? 'primary' : 'secondary',
	}));
