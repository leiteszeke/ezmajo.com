export const siteHost = () => {
	try {
		return new URL(window.extSharedData?.homeUrl ?? '').host;
	} catch {
		return '';
	}
};
