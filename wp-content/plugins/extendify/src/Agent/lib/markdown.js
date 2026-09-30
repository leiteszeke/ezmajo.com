import { external, Icon } from '@wordpress/icons';

const homeUrl = window.extSharedData?.homeUrl;

const isExternalUrl = (url) => {
	try {
		const homeUrlObject = new URL(homeUrl);
		const urlObject = new URL(url);

		return homeUrlObject.hostname !== urlObject.hostname;
	} catch {
		return false;
	}
};

export const customComponents = {
	a: ({ href, children }) => {
		const isExternal = isExternalUrl(href);

		return (
			<a
				href={href}
				{...(isExternal && {
					target: '_blank',
					rel: 'noopener noreferrer',
				})}
			>
				{children}
				{isExternal && (
					<Icon icon={external} size={18} className="ml-0.5 inline" />
				)}
			</a>
		);
	},
};
