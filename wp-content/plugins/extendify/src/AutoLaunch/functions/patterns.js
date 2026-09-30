import { AI_HOST } from '@constants';
import { reqDataBasics } from '@shared/lib/data';
import { retryTwice } from './helpers';

const generatePatterns = async (page, data) => {
	const { siteProfile, designBuild } = data;
	return await retryTwice(async () => {
		const response = await fetch(`${AI_HOST}/api/patterns`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				...reqDataBasics,
				siteProfile,
				page,
				buildId: designBuild?.buildId,
			}),
		});
		if (!response.ok) {
			throw new Error(
				`Pattern generation failed with status ${response.status}`,
			);
		}
		return await response.json();
	});
};

// Hold back patterns that already have finalized content (e.g. design build)
const splitGeneratedContent = (page) => {
	const generated = page.patterns?.filter((p) => p.contentGenerated) ?? [];
	const rest = page.patterns?.filter((p) => !p.contentGenerated) ?? [];
	return { generated, toGenerate: { ...page, patterns: rest } };
};

export const generatePageContent = async (pages, data) => {
	const splits = pages.map(splitGeneratedContent);

	const result = await Promise.allSettled(
		splits.map(({ toGenerate }) =>
			toGenerate.patterns.length
				? generatePatterns(toGenerate, data).catch(() => toGenerate)
				: Promise.resolve(toGenerate),
		),
	);

	return result?.map((pageResult, i) => {
		const original = pages[i];
		const { generated } = splits[i];
		const merged =
			pageResult.status === 'fulfilled' && pageResult.value
				? { ...original, ...pageResult.value }
				: original;
		return {
			...merged,
			patterns: [...generated, ...(merged.patterns ?? [])],
		};
	});
};
