import blogSampleData from '@launch/_data/blog-sample.json';
import {
	generateCustomPatterns,
	getImprintPageTemplate,
} from '@launch/api/DataApi';
import {
	createCategory,
	createPage,
	createPost,
	createTag,
	getActivePlugins,
	getThemeGlobalStyles,
	processPlaceholders,
	updateGlobalStyles,
	updateOption,
	updateThemeVariation,
	uploadMedia,
} from '@launch/api/WPApi';
import { addIdAttributeToBlock } from '@launch/lib/blocks';
import { recordPluginActivity } from '@shared/api/DataApi';
import { pageNames } from '@shared/lib/pages';
import { processWithSecondPass } from '@shared/lib/patterns';
import apiFetch from '@wordpress/api-fetch';
import { rawHandler, serialize } from '@wordpress/blocks';
import { __, sprintf } from '@wordpress/i18n';

// Currently this only processes patterns with placeholders
// by swapping out the placeholders with the actual code
// returns the patterns as blocks with the placeholders replaced
export const replacePlaceholderPatterns = async (patterns) => {
	// Directly replace "blog-section" patterns using their replacement code, skipping the API call
	patterns = patterns.map((pattern) => {
		if (
			pattern.patternTypes.includes('blog-section') &&
			pattern.patternReplacementCode
		) {
			return {
				...pattern,
				code: pattern.patternReplacementCode,
			};
		}
		return pattern;
	});

	const hasPlaceholders = patterns.filter((p) => p.patternReplacementCode);
	if (!hasPlaceholders?.length) return patterns;

	const activePlugins =
		(await getActivePlugins())?.data?.map((path) => path.split('/')[0]) || [];

	const pluginsActivity = patterns
		.filter((p) => p.pluginDependency)
		.map((p) => p.pluginDependency)
		.filter((p) => !activePlugins.includes(p));

	for (const plugin of pluginsActivity) {
		recordPluginActivity({
			slug: plugin,
			source: 'launch',
		});
	}

	return await processWithSecondPass(processPlaceholders, patterns);
};

export const createWpPages = async (pages, { stickyNav }) => {
	const pageIds = [];

	for (const page of pages) {
		const HTML = page.patterns.map(({ code }) => code).join('');
		const blocks = rawHandler({ HTML });

		const content = [];
		// Use this to avoid adding duplicate Ids to patterns
		const seenPatternTypes = new Set();
		// Loop over every
		for (const [i, pattern] of blocks.entries()) {
			const patternType = page.patterns[i]?.patternTypes?.[0];
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

		const pageData = {
			title: page.name,
			status: 'publish',
			content: content.join(''),
			template: stickyNav
				? 'no-title-sticky-header'
				: page.slug === 'home'
					? 'no-title'
					: 'page-with-title',
			meta: { made_with_extendify_launch: true },
		};
		let newPage;
		try {
			newPage = await createPage(pageData);
		} catch (_e) {
			// The above could fail is they are on extendable < 2.0.12
			// TODO: can remove in a month or so
			pageData.template = 'no-title';
			newPage = await createPage(pageData);
		}
		pageIds.push({ ...newPage, originalSlug: page.slug });
	}

	// When we have home, set reading setting
	const maybeHome = pageIds.find(({ originalSlug }) => originalSlug === 'home');
	if (maybeHome) {
		await updateOption('show_on_front', 'page');
		await updateOption('page_on_front', maybeHome.id);
	}

	// When we have blog, set reading setting
	const maybeBlog = pageIds.find(({ originalSlug }) => originalSlug === 'blog');
	if (maybeBlog) {
		await updateOption('page_for_posts', maybeBlog.id);
	}

	return pageIds;
};

export const createWpCategories = async (categories) => {
	const responses = [];
	for (const category of categories) {
		const categoryData = {
			name: category.name,
			slug: category.slug,
			description: category.description,
		};
		let newCategory;
		try {
			newCategory = await createCategory(categoryData);
		} catch (_e) {
			// Fail silently
		}
		if (newCategory?.id && newCategory?.slug) {
			responses.push({ id: newCategory.id, slug: newCategory.slug });
		}
	}
	return responses;
};

export const createWpTags = async (tags) => {
	const responses = [];
	for (const tag of tags) {
		const tagData = {
			name: tag.name,
			slug: tag.slug,
			description: tag.description,
		};
		let newTag;
		try {
			newTag = await createTag(tagData);
		} catch (_e) {
			// Fail silently
		}
		if (newTag?.id && newTag?.slug) {
			responses.push({ id: newTag.id, slug: newTag.slug });
		}
	}
	return responses;
};

export const importImage = async (imageUrl, metadata) => {
	try {
		const loadImage = (img) => {
			return new Promise((resolve, reject) => {
				img.onload = () => resolve();
				img.onerror = () => reject(new Error('Failed to load image.'));
			});
		};

		const image = new Image();
		image.src = imageUrl;
		image.crossOrigin = 'anonymous';
		await loadImage(image);

		const canvas = document.createElement('canvas');
		canvas.width = image.width;
		canvas.height = image.height;

		const ctx = canvas.getContext('2d');
		if (!ctx) return null; // Fail silently

		ctx.drawImage(image, 0, 0);

		const blob = await new Promise((resolve, reject) => {
			canvas.toBlob((blob) => {
				if (blob) resolve(blob);
				else reject(new Error('Failed to convert canvas to Blob.'));
			}, 'image/jpeg');
		});

		const formData = new FormData();
		formData.append(
			'file',
			new File([blob], metadata.filename, { type: 'image/jpeg' }),
		);
		formData.append('alt_text', metadata.alt || '');
		formData.append('caption', metadata.caption || '');
		formData.append('status', 'publish');

		return await uploadMedia(formData);
	} catch (_error) {
		// Fail silently, return null
		return null;
	}
};

export const createBlogSampleData = async (siteStrings, siteImages) => {
	const localizedBlogSampleData =
		blogSampleData[window.extSharedData?.wpLanguage || 'en_US'] ||
		blogSampleData.en_US;

	const categories =
		(await createWpCategories(localizedBlogSampleData.categories)) || [];
	const tags = (await createWpTags(localizedBlogSampleData.tags)) || [];
	const formatImageUrl = (image) =>
		image?.includes('?q=80&w=1470') ? image : `${image}?q=80&w=1470`;
	const imagesArray = (siteImages?.siteImages || []).sort(
		() => Math.random() - 0.5,
	);

	const replacePostContentImages = (content, images) =>
		(content.match(/https:\/\/images\.unsplash\.com\/[^\s"]+/g) || []).reduce(
			(updated, match, i) =>
				updated.replace(match, formatImageUrl(images[i] || match)),
			content,
		);

	const posts = Array.from({ length: 8 }, (_, i) => {
		const title =
			siteStrings?.aiBlogTitles?.[i] ||
			// translators: %s is a post number
			sprintf(__('Blog Post %s', 'extendify-local'), i + 1);
		const featuredImage = imagesArray[i % imagesArray.length]
			? formatImageUrl(imagesArray[i % imagesArray.length])
			: null;
		return {
			name: title,
			featured_image: featuredImage,
			post_content: replacePostContentImages(
				localizedBlogSampleData.post_content,
				imagesArray,
			),
		};
	});

	for (const [index, post] of posts.entries()) {
		try {
			const mediaId = post.featured_image
				? (
						await importImage(post.featured_image, {
							alt: '',
							filename: `featured-image-${index}.jpg`,
							caption: '',
						})
					)?.id || null
				: null;

			const category = categories.length
				? categories[index % categories.length]?.id
				: [];

			const tagFeaturedPost =
				index < 4
					? [tags.find((tag) => tag.slug === 'featured')?.id].filter(Boolean)
					: [];

			const postData = {
				title: post.name,
				content: post.post_content,
				status: 'publish',
				featured_media: mediaId || null,
				categories: category,
				tags: tagFeaturedPost,
				meta: { made_with_extendify_launch: true },
			};

			await createPost(postData);
		} catch (_error) {
			// Fail silently
		}
	}
};

export const setHelloWorldFeaturedImage = async (imageUrls) => {
	try {
		const translatedSlug = window.extOnbData?.helloWorldPostSlug;
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

export const generateCustomPageContent = async (
	pages,
	userState,
	siteProfile,
) => {
	// No ai-generated content
	if (!siteProfile.description || !siteProfile.aiDescription) {
		return pages;
	}

	const { siteId, partnerId, wpLanguage, wpVersion } = window.extSharedData;

	const result = await Promise.allSettled(
		pages.map((page) =>
			generateCustomPatterns(
				page,
				{
					...userState,
					siteId,
					partnerId,
					siteVersion: wpVersion,
					language: wpLanguage,
				},
				siteProfile,
			)
				.then((response) => response)
				.catch(() => page),
		),
	);

	return result?.map((page, i) => page.value || pages[i]);
};

export const updateGlobalStyleVariant = (variation) =>
	updateThemeVariation(window.extSharedData.globalStylesPostID, variation);

export const addImprintPage = async (siteStyle) => {
	try {
		// Get the imprint page template
		const imprintPage = await getImprintPageTemplate(siteStyle);

		// Create the page in WordPress with the fetched template
		const [createdImprintPage] = await createWpPages([imprintPage], {
			stickyNav: false,
		});

		return createdImprintPage;
	} catch (error) {
		console.error('Failed to add imprint page:', error);
		return null;
	}
};

/**
 * Updates natural-1 block style variations with selected vibe styles
 * @param {string} selectedVibe - The vibe to apply (e.g., 'organic-1', 'bold-1')
 */
export const updateNaturalVibeStyles = async (selectedVibe) => {
	if (
		!selectedVibe ||
		typeof selectedVibe !== 'string' ||
		selectedVibe.trim() === '' ||
		selectedVibe === 'natural-1'
	) {
		return;
	}

	const generateSourceStyleName = (naturalStyleName, targetVibe) =>
		naturalStyleName.replace('--natural-1--', `--${targetVibe}--`);

	const processBlockVariations = (variations, targetVibe) =>
		Object.fromEntries(
			Object.entries(variations).map(([styleName, styleProperties]) => {
				if (!styleName.includes('--natural-1--')) {
					return [styleName, { ...styleProperties }];
				}

				const sourceStyleName = generateSourceStyleName(styleName, targetVibe);
				const sourceStyle = variations[sourceStyleName];

				return [
					styleName,
					sourceStyle ? { ...sourceStyle } : { ...styleProperties },
				];
			}),
		);

	try {
		const globalStylesPostID = window.extSharedData?.globalStylesPostID;

		if (!globalStylesPostID) {
			throw new Error('Global styles post ID not found');
		}

		// Fetch theme styles
		const { styles: themeStyles } = await getThemeGlobalStyles();

		if (!themeStyles?.blocks) {
			throw new Error('No block styles found in theme global styles');
		}

		// Process blocks with variations
		const updatedBlocks = Object.fromEntries(
			Object.entries(themeStyles.blocks).map(([blockName, blockObj]) => {
				if (!blockObj?.variations) {
					return [blockName, blockObj];
				}

				const { variations, ...rest } = blockObj;
				const hasNaturalVariations = Object.keys(variations).some((styleName) =>
					styleName.includes('--natural-1--'),
				);

				if (!hasNaturalVariations) {
					return [blockName, blockObj];
				}

				return [
					blockName,
					{
						...rest,
						variations: processBlockVariations(variations, selectedVibe),
					},
				];
			}),
		);

		// Apply the update
		await updateGlobalStyles(globalStylesPostID, {
			styles: { ...themeStyles, blocks: updatedBlocks },
		});
	} catch (error) {
		const errorMessage =
			error?.response?.data?.message || error?.message || 'Unknown error';
		throw new Error(`Vibe update failed: ${errorMessage}`);
	}
};
