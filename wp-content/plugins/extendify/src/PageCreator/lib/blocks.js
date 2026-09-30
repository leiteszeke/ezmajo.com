const root = window.wpApiSettings.root;

// A list of blocks we support installing
export const downloadableBlocksManifest = {
	'contact-form-7': {
		id: 'contact-form-7',
		name: 'contact-form-7/contact-form-selector',
		title: 'Contact Form 7',
		// Links should be presented as it is used internally by Getenberg to decide to install or activate the plugin
		// https://github.com/WordPress/gutenberg/blob/8b7b04ab0c95abd52fb0ef6c7cbb7ec6b440ea23/packages/block-directory/src/store/actions.js#L64C1-L81C5
		// https://github.com/WordPress/gutenberg/blob/843fa85f07003fef70f3d687c4005987444d201a/packages/block-directory/src/store/utils/get-plugin-url.js#L8C1-L17C2
		links: {
			// we want gutenberg to make sure the plugin is activated since we install it beforehand via our own API
			'wp:plugin': [
				{
					href: `${root}wp/v2/plugins/contact-form-7/wp-contact-form-7`,
				},
			],
		},
	},
	simplybook: {
		id: 'simplybook',
		name: 'simplybook/widget',
		title: 'SimplyBook',
		// Links should be presented as it is used internally by Getenberg to decide to install or activate the plugin
		// https://github.com/WordPress/gutenberg/blob/8b7b04ab0c95abd52fb0ef6c7cbb7ec6b440ea23/packages/block-directory/src/store/actions.js#L64C1-L81C5
		// https://github.com/WordPress/gutenberg/blob/843fa85f07003fef70f3d687c4005987444d201a/packages/block-directory/src/store/utils/get-plugin-url.js#L8C1-L17C2
		links: {
			// we want gutenberg to make sure the plugin is activated since we install it beforehand via our own API
			'wp:plugin': [
				{
					href: `${root}wp/v2/plugins/simplybook/simplybook`,
				},
			],
		},
	},
};
