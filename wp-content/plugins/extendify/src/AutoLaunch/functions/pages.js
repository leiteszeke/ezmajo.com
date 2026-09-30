import { importImage, updateOption } from '@auto-launch/functions/wp';
import { launchStrings } from '@auto-launch/strings';
import { PATTERNS_HOST } from '@constants';
import { reqDataBasics } from '@shared/lib/data';
import { pageNames } from '@shared/lib/pages';
import apiFetch from '@wordpress/api-fetch';
import { createBlock, parse, serialize } from '@wordpress/blocks';
import { __ } from '@wordpress/i18n';
import { setStatus } from './helpers';

// Slugs that plugins own — skip creating design-build pages for these.
export const PLUGIN_OWNED_PAGES = [
	{ slug: 'shop', plugin: 'woocommerce' },
	{ slug: 'events', plugin: 'the-events-calendar' },
];

export const isBlogPage = ({ originalSlug }) => originalSlug === 'blog';

export const getPagesToCreate = (data) => {
	const { home, pages, siteProfile } = data;
	const homepage = {
		id: 'home',
		name: pageNames.home.title,
		slug: 'home',
		patterns: home.patterns,
	};
	const hasBlog = pages.some(({ slug }) => slug === 'blog');
	const blogPage =
		siteProfile.blog && !hasBlog
			? {
					name: pageNames.blog.title,
					id: 'blog',
					patterns: [],
					slug: 'blog',
				}
			: null;

	// Remove the page title pattern from all pages
	const patternHasTitle = (pattern) =>
		!pattern.patternTypes?.includes('page-title');
	const p = pages.map((page) => ({
		...page,
		patterns: page.patterns.filter(patternHasTitle),
	}));
	return [homepage, ...p, blogPage].filter(Boolean);
};

// Replace the page-title pattern in “page-with-title” template with the incoming page-title pattern
export const updatePageTitlePattern = async (pageTitlePattern) => {
	const updatedPattern = transformHeadingToPostTitle(pageTitlePattern);

	const templateContent = `
		<!-- wp:template-part {"slug":"header","tagName":"header"} /-->
		<!-- wp:group {"tagName":"main","style":{"spacing":{"margin":{"top":"0px","bottom":"0px"},"blockGap":"0"}}} -->
		<main class="wp-block-group" style="margin-top:0px;margin-bottom:0px">
			${updatedPattern}
			<!-- wp:post-content {"layout":{"type":"constrained"}} /-->
		</main>
		<!-- /wp:group -->
		<!-- wp:template-part {"slug":"footer","tagName":"footer"} /-->
		`;

	try {
		await apiFetch({
			path: '/wp/v2/templates/extendable/page-with-title',
			method: 'POST',
			data: {
				slug: 'page-with-title',
				theme: 'extendable',
				type: 'wp_template',
				status: 'publish',
				description: __('Added by Launch', 'extendify-local'),
				content: templateContent,
			},
		});
	} catch {
		// do nothing
	}
};

// finds the core/heading in the pattern and replaces it with a core/post-title block
const transformHeadingToPostTitle = (rawHTML) => {
	let done = false;

	const walk = (block) => {
		if (done) return block;

		if (block.name === 'core/heading') {
			done = true;
			const attrs = {
				level: block.attributes.level,
				textAlign: block.attributes.textAlign,
				textColor: block.attributes.textColor,
				backgroundColor: block.attributes.backgroundColor,
				isLink: block.attributes.isLink,
				linkTarget: block.attributes.linkTarget,
				rel: block.attributes.rel,
			};

			if (block.attributes.fontSize) {
				attrs.fontSize = block.attributes.fontSize;
			}

			const customSize = block.attributes.style?.typography?.fontSize;
			const linkStyle = block.attributes.style?.elements?.link;

			if (customSize || linkStyle) {
				attrs.style = {};

				if (customSize) {
					attrs.style.typography = { fontSize: customSize };
				}
				if (linkStyle) {
					attrs.style.elements = { link: linkStyle };
				}
			}

			return createBlock('core/post-title', attrs);
		}

		if (block.innerBlocks?.length) {
			block.innerBlocks = block.innerBlocks.map(walk);
		}
		return block;
	};

	return serialize(parse(rawHTML).map(walk));
};

// navSlug: the design menu entry this section was picked for (applyDesignBuildNav).
export const sectionSlug = (pattern) =>
	pattern.navSlug ??
	Object.values(pageNames).find(({ alias }) =>
		alias.includes(pattern.patternTypes?.[0]),
	)?.slug;

export const createWpPages = async (
	pagesRaw,
	{ skipSectionIds = false } = {},
) => {
	const pages = [];

	for (const page of pagesRaw) {
		const content = [];
		const seenPatternTypes = new Set();

		setStatus(launchStrings().statusAddingPage(page.name));

		for (const [_, pattern] of page.patterns.entries()) {
			const code = pattern.code;
			const slug = sectionSlug(pattern);

			if (skipSectionIds || seenPatternTypes.has(slug) || !slug) {
				content.push(code);
				continue;
			}

			seenPatternTypes.add(slug);
			content.push(addIdAttributeToBlock(code, slug));
		}

		const pageData = {
			title: page.name,
			status: 'publish',
			content: content.join(''),
			template: page.slug === 'home' ? 'no-title' : 'page-with-title',
			meta: { made_with_extendify_launch: true },
		};

		let newPage;
		try {
			newPage = await createPage(pageData);
		} catch (_e) {
			pageData.template = 'no-title';
			newPage = await createPage(pageData);
		}

		pages.push({ ...newPage, originalSlug: page.slug });
	}

	const maybeHome = pages.find(({ originalSlug }) => originalSlug === 'home');
	if (maybeHome) {
		await updateOption('show_on_front', 'page');
		await updateOption('page_on_front', maybeHome.id);
	}

	const maybeBlog = pages.find(isBlogPage);
	if (maybeBlog) {
		await updateOption('page_for_posts', maybeBlog.id);
	}

	return pages;
};

export const addIdAttributeToBlock = (blockCode, id) =>
	blockCode.replace(
		/(<div\s[^>]*class="[^"]*\bwp-block-group\b[^"]*")/,
		`$1 id="${id}"`,
	);

export const createPage = (data) =>
	apiFetch({ path: 'wp/v2/pages', data, method: 'POST' });
export const updatePage = (data) =>
	apiFetch({ path: `wp/v2/pages/${data.id}`, data, method: 'POST' });

export const setHelloWorldFeaturedImage = async (imageUrls) => {
	try {
		const translatedSlug = window.extLaunchData?.helloWorldPostSlug;
		let posts = await apiFetch({ path: `wp/v2/posts?slug=${translatedSlug}` });
		if (!posts.length) {
			posts = await apiFetch({ path: 'wp/v2/posts?slug=hello-world' });
		}
		if (!posts.length) return;
		const helloPost = posts[0];
		if (helloPost.featured_media && parseInt(helloPost.featured_media, 10) > 0)
			return;
		if (!Array.isArray(imageUrls) || imageUrls.length === 0) {
			console.error('No image URLs provided.');
			return;
		}
		const lastImageUrl = imageUrls[imageUrls.length - 1];
		const mediaResponse = await importImage(lastImageUrl, {
			alt: __('Hello World Featured Image', 'extendify-local'),
			filename: 'hello-world-featured.jpg',
			caption: '',
		});
		if (!mediaResponse || !mediaResponse.id) {
			console.error('Image upload failed.');
			return;
		}
		await apiFetch({
			path: `wp/v2/posts/${helloPost.id}`,
			method: 'POST',
			data: { featured_media: mediaResponse.id },
		});
	} catch (error) {
		console.error('Failed to set Hello World featured image:', error);
	}
};

export const addImprintPage = async ({ siteStyle }) => {
	try {
		// Get the imprint page template
		const imprintPage = await getImprintPageTemplate({ siteStyle });
		// Create the page in WordPress with the fetched template
		const [createdImprintPage] = await createWpPages([imprintPage]);
		return createdImprintPage;
	} catch (error) {
		console.error('Failed to add imprint page:', error);
		return null;
	}
};

export const getImprintPageTemplate = async ({ siteStyle }) => {
	const res = await fetch(`${PATTERNS_HOST}/api/page-imprint`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ ...reqDataBasics, siteStyle }),
	});
	const response = await res.json();
	return { ...response.template };
};
