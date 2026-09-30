import { sanitizeString } from '@shared/utils/sanitize';

export const getUrlParameter = (parameterName, cleanUrl = true) => {
	const urlParams = new URLSearchParams(window.location.search);
	if (!urlParams.has(parameterName)) return null;

	const sanitizedParameter = sanitizeString(urlParams.get(parameterName));

	if (cleanUrl) {
		urlParams.delete(parameterName);
		const cleanedSearchParameters = urlParams.toString();
		const searchParametersToUrl = cleanedSearchParameters
			? `?${cleanedSearchParameters}`
			: '';

		window.history.replaceState(
			{},
			document.title,
			`${window.location.pathname}${searchParametersToUrl}`,
		);
	}

	return sanitizedParameter;
};
