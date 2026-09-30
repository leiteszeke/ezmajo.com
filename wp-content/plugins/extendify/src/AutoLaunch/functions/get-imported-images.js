import { uploadMediaFromUrl } from '@auto-launch/functions/upload-from-url';

const CONCURRENCY = 3;

// Not the markup: it also carries avatar placeholders the build never chose.
const placedImages = (pattern) => pattern.images ?? [];

// blogImages can name urls the markup never places, and buildBlogPosts prefers them.
const importableImages = (pattern) => [
	...placedImages(pattern),
	...(pattern.blogImages ?? []),
];

const sideload = async (urls) => {
	const map = new Map();
	for (let i = 0; i < urls.length; i += CONCURRENCY) {
		const chunk = urls.slice(i, i + CONCURRENCY);
		const uploaded = await Promise.all(
			chunk.map(async (url) => {
				const fileObj = await uploadMediaFromUrl(url, {
					prefix: 'ext-imported',
					caller: 'importBuiltPagesImages',
				});
				return [url, fileObj?.url ?? null];
			}),
		);
		for (const [url, newUrl] of uploaded) {
			if (newUrl) map.set(url, newUrl);
		}
	}
	return map;
};

// The build's URLs are signed and expire minutes after launch.
export const importBuiltPagesImages = async (builtPages) => {
	if (!builtPages?.length) return builtPages;

	const urls = [
		...new Set(
			builtPages.flatMap((page) =>
				(page.patterns ?? []).flatMap(importableImages),
			),
		),
	];
	if (!urls.length) return builtPages;

	const map = await sideload(urls);
	if (!map.size) return builtPages;

	// A shorter URL that prefixes another would eat it mid-replace.
	const swaps = [...map].sort(([a], [b]) => b.length - a.length);
	const swap = (code) => {
		if (!code) return code;
		let out = code;
		for (const [oldUrl, newUrl] of swaps) {
			out = out.replaceAll(oldUrl, newUrl);
		}
		return out;
	};

	return builtPages.map((page) => ({
		...page,
		patterns: (page.patterns ?? []).map((pattern) => ({
			...pattern,
			code: swap(pattern.code),
			// Plugin sections ship a second copy that process-placeholders promotes over code.
			patternReplacementCode: swap(pattern.patternReplacementCode),
			images: pattern.images?.map((url) => map.get(url) ?? url),
			blogImages: pattern.blogImages?.map((url) => map.get(url) ?? url),
		})),
	}));
};

// A hero has to stay unique, and a named person's face must not decorate another page.
const POOL_EXCLUDED_TYPES = new Set(['hero-header', 'team']);

// Durable image URLs for the siteImages pool: blog-section first, so blog posts
// reuse them card-for-card.
export const collectBuiltPageImageUrls = (builtPages) => {
	if (!builtPages?.length) return [];
	const reusable = builtPages
		.flatMap((page) => page.patterns ?? [])
		.filter(
			(pattern) =>
				!pattern.patternTypes?.some((type) => POOL_EXCLUDED_TYPES.has(type)),
		);
	const ordered = [
		...reusable.filter((p) => p.patternTypes?.includes('blog-section')),
		...reusable.filter((p) => !p.patternTypes?.includes('blog-section')),
	];
	return [...new Set(ordered.flatMap(placedImages))];
};
