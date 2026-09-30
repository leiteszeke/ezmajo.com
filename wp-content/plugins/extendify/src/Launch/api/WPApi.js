import { Axios as api } from '@launch/api/axios';
import {
	fetchFontFaceFile,
	makeFontFaceFormData,
	makeFontFamilyFormData,
} from '@launch/lib/fonts-helpers';
import { pageNames } from '@shared/lib/pages';
import { sleep } from '@shared/lib/utils';
import apiFetch from '@wordpress/api-fetch';
import { createBlock, parse, serialize } from '@wordpress/blocks';
import { __ } from '@wordpress/i18n';
import { addQueryArgs } from '@wordpress/url';

const { wpRoot } = window.extOnbData;

export const updateOption = (option, value) =>
	api.post('launch/options', { option, value });

export const updatePattern = (option, value) =>
	api.post('launch/save-pattern', { option, value });

export const getOption = async (option) => {
	const { data } = await api.get('launch/options', {
		params: { option },
	});
	return data;
};

export const createPage = (pageData) =>
	api.post(`${wpRoot}wp/v2/pages`, pageData);

export const updatePage = (pageData) =>
	api.post(`${wpRoot}wp/v2/pages/${pageData.id}`, pageData);

export const getPageById = (pageId) =>
	api.get(`${wpRoot}wp/v2/pages/${pageId}`);

export const createPost = (postData) =>
	api.post(`${wpRoot}wp/v2/posts`, postData);

export const uploadMedia = (formData) =>
	api.post(`${wpRoot}wp/v2/media`, formData);

export const createCategory = (CategoryData) =>
	api.post(`${wpRoot}wp/v2/categories`, CategoryData);

export const createTag = (tagData) => api.post(`${wpRoot}wp/v2/tags`, tagData);

export const createNavigation = async (
	content = '',
	title = __('Header Navigation', 'extendify-local'),
	slug = 'site-navigation',
) => {
	const payload = await apiFetch({
		path: 'extendify/v1/launch/create-navigation',
		method: 'POST',
		data: {
			title,
			slug,
			content,
		},
	});

	return payload.id;
};

export const updateNavigation = async (id, content) => {
	const payload = await apiFetch({
		path: `wp/v2/navigation/${id}`,
		method: 'POST',
		data: {
			content,
		},
	});

	return payload.id;
};

export const updateTemplatePart = (part, content) =>
	api.post(`${wpRoot}wp/v2/template-parts/${part}`, {
		slug: `${part}`,
		theme: 'extendable',
		type: 'wp_template_part',
		status: 'publish',
		// See: https://github.com/extendify/company-product/issues/833#issuecomment-1804179527
		// translators: Launch is the product name. Unless otherwise specified by the glossary, do not translate this name.
		description: __('Added by Launch', 'extendify-local'),
		content,
	});

const allowedHeaders = ['header', 'header-with-center-nav-and-social'];
const allowedFooters = [
	'footer',
	'footer-social-icons',
	'footer-with-center-logo-and-menu',
];
const allowedNavFooters = [
	'footer-with-nav',
	'footer-with-center-logo-social-nav',
];

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
		return true;
	} catch {
		return false;
	}
};

export const getHeadersAndFooters = async (hasFooterNav = false) => {
	let patterns = await getTemplateParts();
	patterns = patterns?.filter((p) => p.theme === 'extendable');
	const headers = patterns?.filter((p) => allowedHeaders.includes(p?.slug));

	let footerSlugsToUse = allowedFooters;

	if (hasFooterNav) {
		const navFooters = patterns?.filter((p) =>
			allowedNavFooters.includes(p?.slug),
		);
		// Use navFooters only if any are found; otherwise fall back to allowedFooters
		if (navFooters.length > 0) {
			footerSlugsToUse = allowedNavFooters;
		}
	}

	const footers = patterns?.filter((p) => footerSlugsToUse.includes(p?.slug));
	return { headers, footers };
};

const getTemplateParts = () => api.get(`${wpRoot}wp/v2/template-parts`);

export const getThemeVariations = async () => {
	const variations = await api.get(
		`${wpRoot}wp/v2/global-styles/themes/extendable/variations`,
	);

	if (!Array.isArray(variations)) {
		throw new Error('Could not get theme variations');
	}

	// Filter out color and typography presets, and keep only main style variations.
	const mainStyleVariations = variations.filter((variation) => {
		const settingsKeys = Object.keys(variation.settings || {});
		const stylesKeys = Object.keys(variation.styles || {});
		const combinedKeys = new Set([...settingsKeys, ...stylesKeys]);
		return combinedKeys.has('color') && combinedKeys.has('typography');
	});

	// Use slug from theme if available, otherwise generate one from the title
	const variationsWithSlugs = mainStyleVariations.map((variation) => {
		if (variation.slug) return variation;
		const slug = variation.title.toLowerCase().trim().replace(/\s+/, '-');
		return { ...variation, slug };
	});

	// Randomize
	return [...variationsWithSlugs].sort(() => Math.random() - 0.5);
};

export const updateThemeVariation = (id, variation) =>
	api.post(`${wpRoot}wp/v2/global-styles/${id}`, {
		id,
		settings: variation.settings,
		styles: variation.styles,
	});

export const getThemeGlobalStyles = () =>
	api.get(`${wpRoot}wp/v2/global-styles/themes/extendable?context=edit`);

export const updateGlobalStyles = (globalStylesPostID, stylesData) =>
	api.post(`${wpRoot}wp/v2/global-styles/${globalStylesPostID}`, stylesData);

export const addSectionLinksToNav = async (
	navigationId,
	homePatterns = [],
	pluginPages = [],
	createdPages = [],
) => {
	// Extract plugin page slugs for comparison
	const pluginPageTitles = pluginPages.map(({ title }) =>
		title?.rendered?.toLowerCase(),
	);

	const pages =
		createdPages
			?.filter((page) => page?.slug !== 'home')
			?.map((page) => page.slug)
			?.filter(Boolean) ?? [];

	// ['about-us', 'services', 'contact-us']
	const sections = homePatterns
		.map(({ patternTypes }) => patternTypes?.[0])
		.filter(Boolean)
		// Filter out any pattern type that has a page created by 3rd party plugins.
		.filter((patternType) => {
			const { slug } =
				Object.values(pageNames).find(({ alias }) =>
					alias.includes(patternType),
				) || {};
			return slug && !pluginPageTitles.includes(slug);
		});

	const seen = new Set();

	const sectionsNavigationLinks = sections.map((patternType) => {
		const { title, slug } =
			Object.values(pageNames).find(({ alias }) =>
				alias.includes(patternType),
			) || {};
		if (!slug) return '';
		if (seen.has(slug)) return '';
		seen.add(slug);

		const url = pages.includes(slug)
			? `${window.extSharedData.homeUrl}/${slug}`
			: `${window.extSharedData.homeUrl}/#${slug}`;

		const attributes = JSON.stringify({
			label: title,
			type: 'custom',
			url,
			kind: 'custom',
			isTopLevelLink: true,
		});

		return `<!-- wp:navigation-link ${attributes} /-->`;
	});

	const pluginPagesNavigationLinks = pluginPages.map(
		({ title, id, type, link }) => {
			const attributes = JSON.stringify({
				label: title.rendered,
				id,
				type,
				url: link,
				kind: id ? 'post-type' : 'custom',
				isTopLevelLink: true,
			});

			return `<!-- wp:navigation-link ${attributes} /-->`;
		},
	);

	const navigationLinks = sectionsNavigationLinks
		.concat(pluginPagesNavigationLinks)
		.join('');

	await updateNavigation(navigationId, navigationLinks);
};

export const addPageLinksToNav = async (
	navigationId,
	allPages,
	createdPages,
	pluginPages = [],
) => {
	// Because WP may have changed the slug and permalink (i.e., because of different languages),
	// we are using the `originalSlug` property to match the original pages with the updated ones.
	const findCreatedPage = ({ slug }) =>
		createdPages.find(({ originalSlug: s }) => s === slug) || {};

	const filteredCreatedPages = allPages
		.filter((p) => findCreatedPage(p)?.id) // make sure its a page
		.filter(({ slug }) => slug !== 'home') // exclude home page
		.map((page) => findCreatedPage(page));

	// Plugin pages use `slug`, created pages use `originalSlug`
	const getSlug = (page) => page.originalSlug ?? page.slug;
	const getOrder = (page) => {
		const slug = getSlug(page);
		return (
			pageNames[slug]?.navOrder ??
			Object.values(pageNames).find((p) => p.alias?.includes(slug))?.navOrder ??
			Object.keys(pageNames).length + 1
		);
	};

	const mergedPages = [...filteredCreatedPages, ...pluginPages];
	const contactPage = mergedPages.find((page) => {
		const slug = getSlug(page);
		return slug === 'contact' || pageNames.contact?.alias?.includes(slug);
	});

	const sortedPages = mergedPages
		.filter((page) => page !== contactPage)
		.sort((a, b) => getOrder(a) - getOrder(b));

	// Re-insert contact page at the correct position
	const finalPages = contactPage
		? (() => {
				// Top-level links: 5 if 7+ pages, or 6 if exactly 6 pages (no submenu for a single extra link)
				// Note: sortedPages.length is checked AFTER removing contact, so length 5 means 6 total pages
				const index =
					sortedPages.length === 5 ? 5 : Math.min(4, sortedPages.length);
				return [
					...sortedPages.slice(0, index),
					contactPage,
					...sortedPages.slice(index),
				];
			})()
		: sortedPages;

	const pageLinks = finalPages.map(({ id, title, link, type }) => {
		const attributes = JSON.stringify({
			label: title.rendered,
			id,
			type,
			url: link,
			kind: id ? 'post-type' : 'custom',
			isTopLevelLink: true,
		});

		return `<!-- wp:navigation-link ${attributes} /-->`;
	});

	const topLevelLinks = pageLinks.slice(0, 5).join('');
	const submenuLinks = pageLinks.slice(5);
	// We want a max of 6 top-level links, but if 7+, then move the last
	// two+ to a submenu.
	const additionalLinks =
		submenuLinks.length > 1
			? ` <!-- wp:navigation-submenu ${JSON.stringify({
					// translators: "More" here is used for a navigation menu item that contains additional links.
					label: __('More', 'extendify-local'),
					url: '#',
					kind: 'custom',
				})} --> ${submenuLinks.join('')} <!-- /wp:navigation-submenu -->`
			: submenuLinks.join(''); // only 1 link here

	await updateNavigation(navigationId, topLevelLinks + additionalLinks);
};

const getNavAttributes = (headerCode) => {
	try {
		return JSON.parse(headerCode.match(/<!-- wp:navigation([\s\S]*?)-->/)[1]);
	} catch (_e) {
		return {};
	}
};

export const updateNavAttributes = (headerCode, attributes) => {
	const newAttributes = JSON.stringify({
		...getNavAttributes(headerCode),
		...attributes,
	});
	return headerCode.replace(
		// biome-ignore lint: don't want to refactor and test this regex now
		/(<!--\s*wp:navigation\b[^>]*>)([^]*?)(<!--\s*\/wp:navigation\s*-->)/gi,
		`<!-- wp:navigation ${newAttributes} /-->`,
	);
};

export const getActivePlugins = () => api.get('launch/active-plugins');

export const prefetchAssistData = async () =>
	await api.get('launch/prefetch-assist-data');

export const processPlaceholders = (patterns) =>
	apiFetch({
		path: '/extendify/v1/shared/process-placeholders',
		method: 'POST',
		data: { patterns },
	});

export const postLaunchFunctions = () =>
	apiFetch({
		path: '/extendify/v1/launch/post-launch-functions',
		method: 'POST',
	});

export const registerFontFamily = async (fontFamily) => {
	try {
		const existingFontFamily = (
			await apiFetch({
				path: addQueryArgs('/wp/v2/font-families', {
					slug: fontFamily.slug,
					_embed: true,
				}),
				method: 'GET',
			})
		)?.[0];

		if (existingFontFamily) {
			return {
				id: existingFontFamily.id,
				...existingFontFamily.font_family_settings,
				fontFace: existingFontFamily._embedded.font_faces.map(
					({ id, font_face_settings }) => ({
						id,
						...font_face_settings,
					}),
				),
			};
		}

		const newFontFamily = await apiFetch({
			path: '/wp/v2/font-families',
			method: 'POST',
			body: makeFontFamilyFormData(fontFamily),
		});

		return {
			id: newFontFamily.id,
			...newFontFamily.font_family_settings,
			fontFace: newFontFamily.fontFaces,
		};
	} catch (error) {
		console.error('Failed to register font family:', error.message);
		return;
	}
};

export const registerFontFace = async ({ fontFamilyId, ...fontFace }) => {
	const max_retries = 2;

	const fontFaceSlug = `${fontFace.fontFamilySlug}-${fontFace.fontWeight}`;

	for (let attempt = 0; attempt <= max_retries; attempt++) {
		try {
			// Add delay of 1 second if this is not the first attempt
			if (attempt > 0) await sleep(1000);

			const response = await apiFetch({
				path: `/wp/v2/font-families/${fontFamilyId}/font-faces`,
				method: 'POST',
				body: makeFontFaceFormData(fontFace),
			});

			return {
				id: response.id,
				...response.font_face_settings,
			};
		} catch (error) {
			if (attempt <= max_retries) {
				console.error(
					`Failed attempt to upload font file ${fontFaceSlug}:`,
					error.message,
				);
				continue;
			}

			console.error(
				`Failed to upload font file ${fontFaceSlug} after ${max_retries + 1} attempts.`,
			);

			return;
		}
	}
};

export const installFontFamily = async (fontFamily) => {
	const fontFaceDownloadRequests = fontFamily.fontFace.map(async (fontFace) => {
		const file = await fetchFontFaceFile(fontFace.src);
		if (!file) return;
		return { ...fontFace, file };
	});

	const fontFacesWithFile = (
		await Promise.all(fontFaceDownloadRequests)
	).filter(Boolean);

	// If we don't have any font file to install, we don't register the font family.
	if (!fontFacesWithFile.length) return;

	const registeredFontFamily = await registerFontFamily(fontFamily);

	// If we couldn't register the font family, we don't register the font faces.
	if (!registeredFontFamily) return;

	// If font family has font faces, it means it was already registered
	// and doesn't need to be installed.
	if (registeredFontFamily?.fontFace?.length) {
		return registeredFontFamily;
	}

	const fontFaces = fontFacesWithFile.map((fontFace) => ({
		fontFamilyId: registeredFontFamily.id,
		fontFamilySlug: registeredFontFamily.slug,
		...fontFace,
	}));

	const registeredFontFaces = [];

	for (const fontFace of fontFaces) {
		registeredFontFaces.push(await registerFontFace(fontFace));
	}

	return {
		...registeredFontFamily,
		fontFace: registeredFontFaces.filter(Boolean),
	};
};

export const installFontFamilies = async (fontFamilies) => {
	const installedFontFamilies = [];

	for (const fontFamily of fontFamilies) {
		installedFontFamilies.push(await installFontFamily(fontFamily));
	}

	return installedFontFamilies.filter(Boolean);
};
