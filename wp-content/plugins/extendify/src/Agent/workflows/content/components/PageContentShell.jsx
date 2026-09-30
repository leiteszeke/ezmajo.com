import { addIdAttributeToBlock } from '@launch/lib/blocks';
import { usePageCustomContent } from '@page-creator/hooks/usePageCustomContent';
import { processPatterns } from '@page-creator/lib/processPatterns.js';
import { usePageDescriptionStore } from '@page-creator/state/cache';
import { installBlocks } from '@page-creator/util/installBlocks.js';
import { syncPageTitleTemplate } from '@page-creator/util/syncPageTitleTemplate.js';
import { render } from '@shared/lib/dom';
import { pageNames } from '@shared/lib/pages';
import apiFetch from '@wordpress/api-fetch';
import { registerCoreBlocks } from '@wordpress/block-library';
import { getBlockTypes, rawHandler, serialize } from '@wordpress/blocks';
import { useDispatch, useSelect } from '@wordpress/data';
import { store as editorStore } from '@wordpress/editor';
import { useEffect, useRef, useState } from '@wordpress/element';

const { pageTitlePattern } = window.extPageCreator ?? {};

const PageContentShell = ({ pageDescription, onComplete }) => {
	const { page, loading } = usePageCustomContent();
	const { setDescription } = usePageDescriptionStore();
	const { editPost } = useDispatch(editorStore);
	const [patterns, setPatterns] = useState([]);
	const once = useRef(false);
	const { theme, templates } = useSelect((select) => {
		const core = select('core');
		const current = core.getCurrentTheme();

		return {
			theme: current,
			templates: core.getEntityRecords('postType', 'wp_template', {
				per_page: -1,
				context: 'edit',
				theme: current?.stylesheet,
			}),
		};
	}, []);

	useEffect(() => {
		if (getBlockTypes().length !== 0) return;
		registerCoreBlocks();
	}, []);

	useEffect(() => {
		setDescription(pageDescription);
	}, [pageDescription, setDescription]);

	useEffect(() => {
		if (!page && loading) return;
		if (once.current) return;
		once.current = true;
		(async () => {
			// If page-with-title template isn’t customized and a page-title pattern is stashed, update the template with it.
			await syncPageTitleTemplate(pageTitlePattern);

			const patterns = await processPatterns(page?.patterns);
			await installBlocks({ patterns });
			setPatterns(patterns);
		})();
	}, [loading, page, setPatterns]);

	useEffect(() => {
		if (!patterns?.length || !once.current) return;
		if (!theme || !Array.isArray(templates)) return;

		const isExtendable = theme.textdomain === 'extendable';
		const hasPageWithTitle =
			isExtendable && templates.some((t) => t.slug === 'page-with-title');

		const id = setTimeout(async () => {
			const result = await insertPage({
				hasPageWithTitle,
				patterns,
				title: page.title,
			});
			onComplete(result);
		}, 30_000); // 30 seconds to insert the page in WordPress.

		return () => clearTimeout(id);
	}, [patterns, editPost, page, theme, templates, onComplete]);

	return null; // Renders nothing
};

const insertPage = async ({ hasPageWithTitle, patterns, title }) => {
	const patternsToInsert = hasPageWithTitle
		? patterns.filter((p) => !p.patternTypes?.includes('page-title'))
		: patterns;

	const pagePatterns = patternsToInsert.map(({ code, ...prop }) => {
		// find links with #extendify- like href="#extendify-hero-cta"
		const linksRegex = /href="#extendify-([^"]+)"/g;
		return {
			...prop,
			//  replaceAll() is an ES2021 method. Since the regex already has the global flag (/g),
			//  we can use the older replace() method for broader browser compatibility.
			code: code.replace(linksRegex, 'href="#"'),
		};
	});

	const HTML = pagePatterns.map(({ code }) => code).join('');
	const blocks = rawHandler({ HTML });

	const content = [];
	// Use this to avoid adding duplicate Ids to patterns
	const seenPatternTypes = new Set();

	for (const [i, pattern] of blocks.entries()) {
		const patternType = pagePatterns[i].patternTypes?.[0];
		const serializedBlock = serialize(pattern);
		// Get the translated slug
		const { slug } =
			Object.values(pageNames).find(({ alias }) =>
				alias.includes(patternType),
			) || {};

		// If we've already seen this slug, or no slug found, return the pattern unchanged
		if (seenPatternTypes.has(slug) || !slug) {
			content.push(serializedBlock);
			continue;
		}
		// Add the slug to the seen list so we don't add it again
		seenPatternTypes.add(slug);

		content.push(addIdAttributeToBlock(serializedBlock, slug));
	}

	const data = {
		title,
		status: 'draft',
		content: content.join(''),
		template: !hasPageWithTitle ? 'no-title-sticky-header' : 'page-with-title',
		meta: { made_with_extendify_launch: true },
	};

	return await apiFetch({ path: '/wp/v2/pages', method: 'POST', data });
};

// This is used as a bridge between this hidden component and the tool.
export const generatePage = (pageDescription) => {
	return new Promise((resolve, reject) => {
		const container = document.createElement('div');
		container.style.display = 'none';
		document.body.appendChild(container);
		let isCompleted = false;
		const cleanup = () => {
			if (container.parentNode) container.remove();
		};

		const handleComplete = (data) => {
			if (isCompleted) return;
			isCompleted = true;
			cleanup();

			!data
				? reject(new Error('Something went wrong while creating the page'))
				: resolve(data);
		};

		try {
			render(
				<PageContentShell
					onComplete={(data) => {
						handleComplete(data);
					}}
					pageDescription={pageDescription}
				/>,
				container,
			);
		} catch (error) {
			cleanup();
			reject(error);
		}
	});
};
