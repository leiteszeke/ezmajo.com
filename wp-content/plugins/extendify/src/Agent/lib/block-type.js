// Wrapper / dynamic-content blocks that aren't editable on the front end.
const KNOWN_UNSUPPORTED = new Set([
	'wp-block-post-title',
	'wp-block-post-author',
	'wp-block-post-date',
	'wp-block-post-terms',
	// core/navigation wraps individual links; clicks route to the child link instead.
	'wp-block-navigation',
]);

// BEM children and helper classes, not block types.
const WP_BLOCK_CLASS_BLOCKLIST = /__|^wp-block-(post|theme|root|preset)-/;

// Unknown wp-block-* slugs would fabricate a wrong block type, so only known core slugs derive one.
const CORE_BLOCK_SLUGS = new Set([
	'paragraph',
	'heading',
	'list',
	'list-item',
	'quote',
	'pullquote',
	'code',
	'preformatted',
	'verse',
	'details',
	'footnotes',
	'table',
	'table-of-contents',
	'image',
	'gallery',
	'audio',
	'video',
	'file',
	'cover',
	'media-text',
	'embed',
	'buttons',
	'button',
	'columns',
	'column',
	'group',
	'separator',
	'spacer',
	'more',
	'nextpage',
	'social-links',
	'social-link',
	'search',
	'html',
	'shortcode',
	'page-list',
	'page-list-item',
	'navigation-link',
	'navigation-submenu',
	'home-link',
	'loginout',
	'site-logo',
	'site-title',
	'site-tagline',
	'archives',
	'calendar',
	'categories',
	'latest-posts',
	'latest-comments',
	'rss',
	'tag-cloud',
	'avatar',
	'read-more',
	'term-description',
]);

export const detectBlockType = (el) => {
	let firstWpBlockClass = null;
	for (const cls of el.classList) {
		if (KNOWN_UNSUPPORTED.has(cls)) return null;
		if (!firstWpBlockClass && cls.startsWith('wp-block-')) {
			if (!WP_BLOCK_CLASS_BLOCKLIST.test(cls)) firstWpBlockClass = cls;
		}
	}
	// Nav links/submenus don't always carry the -link/-submenu class, so match -item too.
	if (
		el.classList.contains('wp-block-navigation-item') ||
		el.classList.contains('wp-block-navigation-link') ||
		el.classList.contains('wp-block-navigation-submenu')
	) {
		return 'core/navigation-link';
	}
	if (firstWpBlockClass) {
		const slug = firstWpBlockClass.slice('wp-block-'.length);
		return CORE_BLOCK_SLUGS.has(slug) ? `core/${slug}` : null;
	}
	// Tag fallback for class-less <p>/<h1-6>/<li>; nav <li>s carry a class and resolve above.
	const tag = el.tagName.toLowerCase();
	if (tag === 'p') return 'core/paragraph';
	if (/^h[1-6]$/.test(tag)) return 'core/heading';
	if (tag === 'li') return 'core/list-item';
	return null;
};
