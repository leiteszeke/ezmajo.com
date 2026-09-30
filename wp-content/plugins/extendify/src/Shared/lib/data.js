// Optionally add items to request body
const allowList = [
	'partnerId',
	'devbuild',
	'version',
	'siteId',
	'homeUrl',
	'wpLanguage',
	'wpVersion',
	'siteCreatedAt',
	'siteProfile',
];

export const reqDataBasics = {
	...Object.fromEntries(
		Object.entries(window.extSharedData).filter(([key]) =>
			allowList.includes(key),
		),
	),
};
