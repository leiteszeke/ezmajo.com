import { getRenderingMode, setRenderingMode } from '@agent/lib/editor';
import { select } from '@wordpress/data';

export default async () => {
	const renderingMode = getRenderingMode();
	// temp disable if user has templates showing
	if (renderingMode === 'template-locked') await setRenderingMode('post-only');
	const blocks = select('core/block-editor').getBlocks();
	const title = select('core/editor').getEditedPostAttribute('title');
	const post_strings = dedupeStrings([
		title,
		...extractTextFromEditorBlocks(blocks),
	]);
	if (renderingMode === 'template-locked') setRenderingMode('template-locked');
	return { post_strings };
};

const extractTextFromEditorBlocks = (blocks) =>
	blocks.flatMap((block) => [
		// Extract from relevant string attributes (live editor state)
		...['content', 'caption', 'alt', 'title', 'value']
			.map((key) =>
				typeof block?.attributes?.[key] === 'string'
					? block.attributes[key].trim()
					: null,
			)
			// Might be in rich text
			.map(() =>
				typeof block?.attributes?.text?.text === 'string'
					? block.attributes.text.text.trim()
					: null,
			)
			.filter(Boolean),
		// Extract from rendered HTML (if available)
		...(block.originalContent
			? [
					stripHtml(block.originalContent),
					...extractAltAndTitleFromHtml(block.originalContent),
				].filter(Boolean)
			: []),
		// Recurse into innerBlocks
		...extractTextFromEditorBlocks(block.innerBlocks || []),
	]);

const newSet = (arr) => new Set(arr.filter(Boolean));
const dedupeStrings = (arr) => [...newSet(arr)];

const stripHtml = (html) =>
	html
		.replace(/<[^>]+>/g, '')
		.replace(/\s+/g, ' ')
		.trim();

// Handles image stuff
const extractAltAndTitleFromHtml = (html) => {
	const matches = [];
	const altMatch = html.match(/alt="([^"]*)"/);
	if (altMatch?.[1]) matches.push(altMatch[1].trim());
	const titleMatch = html.match(/title="([^"]*)"/);
	if (titleMatch?.[1]) matches.push(titleMatch[1].trim());
	return matches;
};
