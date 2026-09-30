import { getLinkSuggestions } from '@launch/api/DataApi';
import {
	getActivePlugins,
	getOption,
	getPageById,
	updatePage,
} from '@launch/api/WPApi';
import { pageNames } from '@shared/lib/pages';
import { wasPluginInstalled } from '@shared/lib/utils';
import { getBlockContent, rawHandler } from '@wordpress/blocks';
import { prependHTTPS } from '@wordpress/url';

const { homeUrl } = window.extSharedData;
const buttonRegex = /href="(#extendify-[\w-]+)"/gi;
const pagesWithButtons = (p) => p?.content?.raw?.match(buttonRegex);

export const updateButtonLinks = async (wpPages, pluginPages) => {
	// Fetch active plugins after installing plugins
	const { data: activePlugins } = await getActivePlugins();
	const contactPageSlug = wpPages.find(({ originalSlug }) =>
		originalSlug.startsWith('contact'),
	)?.slug;

	const patternsToProcess = wpPages
		// Look for pages with links
		.filter(pagesWithButtons)
		.map(({ content }) => {
			// 1. Convert to individual blocks
			return (
				rawHandler({ HTML: content.raw || '' })
					// 2. Convert back to HTML
					.map((b) => getBlockContent(b))
					// 3. Filter only blocks with links
					.filter((b) => b.match(buttonRegex))
					.join('')
				// TODO: Filter out patterns from pages that have identical buttons?
			);
		});

	// Collect the page slugs to share with the server
	const availablePages = wpPages
		.concat(pluginPages)
		.filter(({ slug }) => !slug.startsWith('home'))
		.map(({ slug }) => `/${slug}`);

	// Add plugin related pages only if plugin is active
	if (wasPluginInstalled(activePlugins, 'woocommerce')) {
		const shopPage = await getPageById(
			await getOption('woocommerce_shop_page_id'),
		);

		if (shopPage) {
			availablePages.push(`/${shopPage.slug}`);
		}
	}

	// Fetch the links from the server. If a request fails, ignore it.
	const suggestedLinks = (
		await Promise.allSettled(
			patternsToProcess.map(
				(pageContent) => getLinkSuggestions(pageContent, availablePages) || {},
			),
		)
	)
		.filter((r) => r.status === 'fulfilled')
		.map((r) => r.value?.suggestedLinks || [])
		// Combine all suggested links
		.reduce((acc, link) => {
			for (const key in link) {
				acc[key] = link[key];
			}
			return acc;
		}, {});

	const linkKeys = Object.keys(suggestedLinks)
		.filter((k) =>
			// Remove links sent back that aren't in the availablePages
			availablePages.includes(`/${suggestedLinks[k].replace(/^\//, '')}`),
		)
		.map((v) => `\\"${v}\\"`)
		.join('|');

	// Replace links and update the pages. Failed pages get ignored.
	const newPages = (
		await Promise.allSettled(
			wpPages.filter(pagesWithButtons).map((p) => {
				// We want to match \"extendify-cta\" exactly inside the href
				// So we need to look for the quotes, then replace with the quotes
				const content = linkKeys
					? p.content.raw.replace(new RegExp(linkKeys, 'g'), (match) => {
							if (!match || suggestedLinks.length === 0) return '';

							const link = suggestedLinks[match.replace(/"/g, '')];
							// if the link points to the current page or '/'
							// we should link to the contact page (or default to '/')
							if ([p.slug, `/${p.slug}`, '/'].includes(link))
								return `"${homeUrl}/${contactPageSlug ?? ''}"`;

							// The server once sent back slugs without the /
							// so we need to check
							return `"${homeUrl}/${link.replace(/^\//, '')}"`;
						})
					: p.content.raw.replace(new RegExp(buttonRegex, 'g'), (match) => {
							return match ? 'href="#"' : '';
						});
				return updatePage({ id: p.id, content });
			}),
		)
	)
		.filter((r) => r.status === 'fulfilled')
		.map((r) => r.value);

	return (
		wpPages
			// Add the new pages into the wpPages array
			.map((p) => newPages.find(({ id }) => id === p.id) || p)
			// Also include the originalSlug from wpPages
			.map((p) => {
				const { originalSlug } = wpPages.find(({ id }) => id === p.id) || {};
				return { ...p, originalSlug };
			})
	);
};

export const updateSinglePageLinksToSections = async (
	wpPages,
	pages,
	options = {},
) => {
	let homePageContent = wpPages?.[0]?.content?.raw;
	if (!homePageContent) return wpPages;

	/**
	 * Special case handling for landing page sites.
	 *
	 * For landing pages, all internal navigation links are either replaced with
	 * a single, provided CTA link, or set to '#' if no CTA link is provided.
	 * This function updates the home page content and returns the updated pages array.
	 */
	const { linkOverride, siteObjective } = options;
	if (siteObjective === 'landing-page') {
		wpPages[0] = updatePage({
			id: wpPages[0].id,
			content: homePageContent.replaceAll(
				/href="(#extendify-[\w|-]+)"/gi,
				linkOverride ? `href="${prependHTTPS(linkOverride)}"` : 'href="#"',
			),
		});

		return wpPages;
	}

	// get all the patterns that we have in the home page
	const patternTypes = pages?.[0]?.patterns
		?.map((pattern) => pattern?.patternTypes?.[0])
		?.filter((patternType) => patternType !== 'hero-header')
		?.map((patternType) => {
			const { slug } =
				Object.values(pageNames).find(({ alias }) =>
					alias.includes(patternType),
				) || {};
			return slug;
		})
		?.filter(Boolean)
		?.flat();

	const createdPages =
		pages
			?.filter((page) => page.slug !== 'home')
			?.map((page) => page.slug)
			?.filter(Boolean) ?? [];

	// get the active plugins
	const { data: activePlugins } = await getActivePlugins();
	const pluginPages = [];

	// check if woocommerce is active, if so we add it to the list of pages
	if (wasPluginInstalled(activePlugins, 'woocommerce')) {
		const page = await getPageById(
			await getOption('woocommerce_shop_page_id'),
		).catch(() => null);

		page?.slug && pluginPages.push(page.slug);
	}

	// check if events calendar is active, if so we add it to the list of pages
	if (wasPluginInstalled(activePlugins, 'the-events-calendar')) {
		pluginPages.push('events');
	}

	const allAvailablePages = (patternTypes ?? []).concat(pluginPages);
	if (!allAvailablePages.length) {
		wpPages[0] = updatePage({
			id: wpPages[0].id,
			content: homePageContent.replaceAll(
				/href="(#extendify-[\w|-]+)"/gi,
				'href="#"',
			),
		});
		return wpPages;
	}

	// get the suggested links from the AI and send both the patterns and the plugin pages.
	const { suggestedLinks } =
		(await getLinkSuggestions(homePageContent, allAvailablePages)) || {};

	// replace the links
	homePageContent = Object.keys(suggestedLinks ?? {}).reduce((content, key) => {
		const slug = suggestedLinks[key];

		if (!slug) return content;

		const newLink = pluginPages.concat(createdPages).includes(slug)
			? `"${homeUrl}/${slug}"`
			: `"${homeUrl}/#${slug}"`;

		return content.replaceAll(`"${key}"`, newLink);
	}, homePageContent);

	// Update the first page by replacing the buttons urls with the new slug
	wpPages[0] = updatePage({
		id: wpPages[0].id,
		content: homePageContent,
	});

	return wpPages;
};
