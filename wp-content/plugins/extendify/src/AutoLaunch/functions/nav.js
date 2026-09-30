import { pageNames } from '@shared/lib/pages';
import apiFetch from '@wordpress/api-fetch';
import { __ } from '@wordpress/i18n';
import { addQueryArgs } from '@wordpress/url';

export const createNavigation = async ({ content = '', title, slug }) => {
	const existing = await apiFetch({
		path: addQueryArgs('extendify/v1/auto-launch/get-navigation', { slug }),
	}).catch(() => undefined);

	if (existing?.id) return existing;

	return await apiFetch({
		path: 'extendify/v1/auto-launch/create-navigation',
		method: 'POST',
		data: { title, slug, content },
	});
};

export const updateNavigation = (id, content) =>
	apiFetch({
		path: `wp/v2/navigation/${id}`,
		method: 'POST',
		data: { content },
	});

const navLink = (attributes) =>
	`<!-- wp:navigation-link ${JSON.stringify(attributes)} /-->`;

const pluginPageLink = (page) =>
	navLink({
		label: page.title?.rendered ?? page.name,
		id: page.id,
		type: page.type,
		url: page.link,
		kind: page.id ? 'post-type' : 'custom',
		isTopLevelLink: true,
	});

const anchorLink = ({ label, url }) =>
	navLink({ label, type: 'custom', url, kind: 'custom', isTopLevelLink: true });

export const addSectionLinksToNav = async (
	navigationId,
	homePatterns = [],
	pluginPages = [],
	createdPages = [],
	{ orderedSlugs = [] } = {},
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

	const resolve = (pattern) => {
		const patternType = pattern.patternTypes?.[0];
		const lookup =
			Object.values(pageNames).find(({ alias }) =>
				alias.includes(patternType),
			) || {};
		return { label: lookup.title, slug: lookup.slug };
	};

	const sectionPatterns = homePatterns.filter((pattern) => {
		const { slug } = resolve(pattern);
		return slug && !pluginPageTitles.includes(slug);
	});

	const seen = new Set();

	const sectionsNavigationLinks = sectionPatterns.map((pattern) => {
		const { label, slug } = resolve(pattern);
		if (!slug) return '';
		if (seen.has(slug)) return '';
		seen.add(slug);

		const url = pages.includes(slug)
			? `${window.extSharedData.homeUrl}/${slug}`
			: `${window.extSharedData.homeUrl}/#${slug}`;

		return anchorLink({ label, url });
	});

	const pluginPagesNavigationLinks = pluginPages.map(pluginPageLink);

	// When an ordered slug list is provided, interleave plugin pages by slug
	// so e.g. "shop" lands where the design preview placed it.
	let navigationLinks;
	if (orderedSlugs.length) {
		const bySlug = new Map();
		sectionsNavigationLinks.forEach((link, i) => {
			const slug = resolve(sectionPatterns[i]).slug;
			if (slug) bySlug.set(slug, link);
		});
		pluginPages.forEach((page, i) => {
			if (page.slug) bySlug.set(page.slug, pluginPagesNavigationLinks[i]);
		});
		const ordered = orderedSlugs
			.map((slug) => bySlug.get(slug))
			.filter(Boolean);
		const placed = new Set(orderedSlugs.filter((s) => bySlug.has(s)));
		const extras = [
			...sectionsNavigationLinks.filter(
				(_, i) => !placed.has(resolve(sectionPatterns[i]).slug),
			),
			...pluginPagesNavigationLinks.filter(
				(_, i) => !placed.has(pluginPages[i].slug),
			),
		];
		navigationLinks = [...ordered, ...extras].join('');
	} else {
		navigationLinks = sectionsNavigationLinks
			.concat(pluginPagesNavigationLinks)
			.join('');
	}

	await updateNavigation(navigationId, navigationLinks);
};

// Full-page single-page: the design build's page list IS the menu, in order —
// the same list the preview nav used — and the BE baked matching #section
// anchors into the page HTML. Build straight from it; no pattern derivation.
export const addSectionLinksFromDesign = async (
	navigationId,
	designPages = [],
	pluginPages = [],
) => {
	const { homeUrl } = window.extSharedData;
	const pluginBySlug = new Map(pluginPages.map((page) => [page.slug, page]));

	const sectionLink = ({ slug, name }) =>
		anchorLink({ label: name, url: `${homeUrl}/#${slug}` });

	const seen = new Set();
	const links = [];
	for (const { slug, name } of designPages) {
		if (!slug || slug === 'home' || seen.has(slug)) continue;
		seen.add(slug);
		const pluginPage = pluginBySlug.get(slug);
		links.push(
			pluginPage ? pluginPageLink(pluginPage) : sectionLink({ slug, name }),
		);
	}
	// An active plugin page the design didn't place still belongs in the nav.
	for (const page of pluginPages) {
		if (!page.slug || seen.has(page.slug)) continue;
		seen.add(page.slug);
		links.push(pluginPageLink(page));
	}

	await updateNavigation(navigationId, links.join(''));
};

export const addPageLinksToNav = async (
	navigationId,
	allPages,
	createdPages,
	pluginPages = [],
	{ orderedSlugs = [] } = {},
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
	const seen = new Set();
	const mergedPages = [...filteredCreatedPages, ...pluginPages].filter(
		(page) => {
			const slug = getSlug(page);
			if (!slug) return true;
			if (seen.has(slug)) return false;
			seen.add(slug);
			return true;
		},
	);

	let finalPages;
	if (orderedSlugs.length) {
		const indexOf = (p) => orderedSlugs.indexOf(getSlug(p));
		const ordered = mergedPages
			.filter((p) => indexOf(p) !== -1)
			.sort((a, b) => indexOf(a) - indexOf(b));
		const extras = mergedPages.filter((p) => indexOf(p) === -1);
		finalPages = [...ordered, ...extras];
	} else {
		const contactPage = mergedPages.find((page) => {
			const slug = getSlug(page);
			return slug === 'contact' || pageNames.contact?.alias?.includes(slug);
		});

		const sortedPages = mergedPages
			.filter((page) => page !== contactPage)
			.sort((a, b) => getOrder(a) - getOrder(b));

		finalPages = contactPage
			? (() => {
					const index =
						sortedPages.length === 5 ? 5 : Math.min(4, sortedPages.length);
					return [
						...sortedPages.slice(0, index),
						contactPage,
						...sortedPages.slice(index),
					];
				})()
			: sortedPages;
	}

	const pageLinks = finalPages.map(pluginPageLink);

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

const getNavExtrasBlock = (launchDecisions) => {
	switch (launchDecisions?.navExtras) {
		case 'button': {
			const label =
				launchDecisions?.navButtonLabel || __('Get Started', 'extendify-local');
			return `<!-- wp:buttons {"className":"ext-nav-extras-btn"} -->
<div class="wp-block-buttons ext-nav-extras-btn"><!-- wp:button {"className":"is-style-ext-preset\u002d\u002dbutton\u002d\u002dnatural-1\u002d\u002dbutton-1","style":{"spacing":{"padding":{"left":"20px","right":"20px","top":"8px","bottom":"8px"}},"typography":{"lineHeight":1.6}},"fontSize":"small"} -->
<div class="wp-block-button is-style-ext-preset--button--natural-1--button-1"><a class="wp-block-button__link has-small-font-size has-custom-font-size wp-element-button" href="#extendify-navbar-cta" style="padding-top:8px;padding-right:20px;padding-bottom:8px;padding-left:20px;line-height:1.6">${label}</a></div>
<!-- /wp:button --></div>
<!-- /wp:buttons -->`;
		}
		case 'phone-number':
			return `<!-- wp:group {"className":"ext-nav-extras-phone","style":{"spacing":{"blockGap":"6px"}},"layout":{"type":"flex","flexWrap":"nowrap","verticalAlignment":"center"}} -->
<div class="wp-block-group ext-nav-extras-phone"><!-- wp:image {"sizeSlug":"large","style":{"layout":{"selfStretch":"fixed","flexSize":"21px"},"color":{"duotone":"var:preset|duotone|primary-foreground"},"spacing":{"margin":{"bottom":"6px"}}}} -->
<figure class="wp-block-image size-large" style="margin-bottom:6px"><img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMiIgaGVpZ2h0PSIzMiIgZmlsbD0iIzAwMDAwMCIgdmlld0JveD0iMCAwIDI1NiAyNTYiPjxwYXRoIGQ9Ik0yMjQsMTU0LjhsLTQ3LjA5LTIxLjExLS4xOC0uMDhhMTkuOTQsMTkuOTQsMCwwLDAtMTksMS43NSwxMy4wOCwxMy4wOCwwLDAsMC0xLjEyLjg0bC0yMi4zMSwxOWMtMTMtNy4wNS0yNi40My0yMC4zNy0zMy40OS0zMy4yMWwxOS4wNi0yMi42NmExMS43NiwxMS43NiwwLDAsMCwuODUtMS4xNSwyMCwyMCwwLDAsMCwxLjY2LTE4LjgzLDEuNDIsMS40MiwwLDAsMS0uMDgtLjE4TDEwMS4yLDMyQTIwLjA2LDIwLjA2LDAsMCwwLDgwLjQyLDIwLjE1LDYwLjI3LDYwLjI3LDAsMCwwLDI4LDgwYzAsODEuNjEsNjYuMzksMTQ4LDE0OCwxNDhhNjAuMjcsNjAuMjcsMCwwLDAsNTkuODUtNTIuNDJBMjAuMDYsMjAuMDYsMCwwLDAsMjI0LDE1NC44Wk0xNzYsMjA0QTEyNC4xNSwxMjQuMTUsMCwwLDEsNTIsODAsMzYuMjksMzYuMjksMCwwLDEsODAuNDgsNDQuNDZsMTguODIsNDJMODAuMTQsMTA5LjI4YTEyLDEyLDAsMCwwLS44NiwxLjE2QTIwLDIwLDAsMCwwLDc4LDEzMC4wOGM5LjQyLDE5LjI4LDI4LjgzLDM4LjU2LDQ4LjMxLDQ4QTIwLDIwLDAsMCwwLDE0NiwxNzYuNjNhMTEuNjMsMTEuNjMsMCwwLDAsMS4xMS0uODVsMjIuNDMtMTkuMDcsNDIsMTguODFBMzYuMjksMzYuMjksMCwwLDEsMTc2LDIwNFoiPjwvcGF0aD48L3N2Zz4=" alt=""/></figure>
<!-- /wp:image -->

<!-- wp:paragraph {"className":"no-underline","style":{"elements":{"link":{"color":{"text":"var:preset|color|primary"}}},"typography":{"fontSize":"18px","fontStyle":"normal","fontWeight":"700","textDecoration":"none"}},"textColor":"primary"} -->
<p class="no-underline has-primary-color has-text-color has-link-color" style="font-size:18px;font-style:normal;font-weight:700;text-decoration:none"><a href="tel:206-555-0100" data-type="tel" data-id="tel:206-555-0100">206-555-0100</a></p>
<!-- /wp:paragraph --></div>
<!-- /wp:group -->`;
		case 'social-icons':
			return `<!-- wp:social-links {"iconColor":"foreground","iconColorValue":"var(--wp--preset--color--foreground)","size":"has-small-icon-size","className":"is-style-logos-only ext-hidden tablet:ext-flex ext-nav-extras-social","style":{"spacing":{"blockGap":"1rem"}},"layout":{"type":"flex","flexWrap":"nowrap","justifyContent":"right"}} -->
<ul class="wp-block-social-links has-small-icon-size has-icon-color is-style-logos-only ext-hidden tablet:ext-flex ext-nav-extras-social"><!-- wp:social-link {"url":"https://www.instagram.com/","service":"instagram"} /-->

<!-- wp:social-link {"url":"https://www.facebook.com/","service":"facebook"} /-->

<!-- wp:social-link {"url":"https://x.com/","service":"x"} /--></ul>
<!-- /wp:social-links -->`;
		default:
			return null;
	}
};

// Woo auto-inserts these after the nav, but WP suppresses them when AutoLaunch
// saves the header directly — insert them ourselves so they render. fontSize
// matches Extendable's nav (`small`).
export const injectWooCommerceIcons = (headerCode) => {
	// The fetched header can already carry them: WP materializes hooked blocks
	// into REST responses once Woo is active (e.g. on a re-launch).
	if (/wp:woocommerce\/(mini-cart|customer-account)/.test(headerCode)) {
		return headerCode;
	}

	// After updateNavAttributes the nav block is always self-closing.
	const navBlock = /<!--\s*wp:navigation\b[^>]*?\/-->/i;
	if (!navBlock.test(headerCode)) return headerCode;

	const icons = [
		'<!-- wp:woocommerce/customer-account {"displayStyle":"icon_only","iconStyle":"line","iconClass":"wc-block-customer-account__account-icon","fontSize":"small"} /-->',
		'<!-- wp:woocommerce/mini-cart {"fontSize":"small"} /-->',
	].join('\n');

	return headerCode.replace(navBlock, (nav) => `${nav}\n${icons}`);
};

export const injectNavExtras = (headerCode, launchDecisions) => {
	const navExtras = launchDecisions?.navExtras;
	if (!navExtras || navExtras === 'none') return headerCode;

	const block = getNavExtrasBlock(launchDecisions);
	if (!block) return headerCode;

	// Strip any existing ext-nav-extras-* block so we don't stack with what the
	// header may already ship with.
	const stripped = headerCode.replace(
		/<!--\s*wp:([\w-]+)\b[^>]*ext-nav-extras-[\w-]+[^>]*-->[\s\S]*?<!--\s*\/wp:\1\s*-->\s*/g,
		'',
	);

	const markerIdx = stripped.indexOf('ext-nav-extras');
	if (markerIdx === -1) return stripped;

	const groupCloseMatch = stripped
		.slice(markerIdx)
		.match(/<!--\s*\/wp:group\s*-->/);
	if (!groupCloseMatch) return stripped;

	const insertAt = markerIdx + groupCloseMatch.index;
	return `${stripped.slice(0, insertAt)}${block}\n${stripped.slice(insertAt)}`;
};
