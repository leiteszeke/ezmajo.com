// A partner-authored link can't know the customer's host at authoring time.
const withSiteHost = (link, host) => link?.replaceAll('{SITEURL}', host);

export const siteHost = () => {
	try {
		return new URL(window.extSharedData?.homeUrl ?? '').host;
	} catch {
		return '';
	}
};

export const resolveNotificationLink = (notification, host = '') => {
	const href = withSiteHost(notification?.link, host);
	if (!href) return {};
	try {
		return { href, external: new URL(href).host !== host };
	} catch {
		// URL() throws on relative paths, which are never external.
		return { href };
	}
};

// `rel` travels with `target`, or the new tab keeps a handle back to wp-admin.
export const externalLinkProps = (external) =>
	external ? { target: '_blank', rel: 'noreferrer' } : {};
