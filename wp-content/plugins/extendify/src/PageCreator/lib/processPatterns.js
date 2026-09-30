import { getActivePlugins, processPlaceholders } from '@page-creator/api/WPApi';
import { recordPluginActivity } from '@shared/api/DataApi';
import { failedDependencies } from '@shared/lib/patterns';
import { sleep } from '@shared/lib/utils';

export const processPatterns = async (patterns) => {
	const maxAttempts = 3;
	const delay = 1000; // 1 second delay between retries

	const activePlugins =
		(await getActivePlugins())?.data?.map((path) => path.split('/')[0]) || [];

	const pluginsActivity = patterns
		.filter((p) => p.pluginDependency)
		.map((p) => p.pluginDependency)
		.filter((p) => !activePlugins.includes(p));

	for (const plugin of pluginsActivity) {
		recordPluginActivity({
			slug: plugin,
			source: 'page-creator',
		});
	}

	for (let attempt = 1; attempt <= maxAttempts; attempt++) {
		try {
			const processed = await processPlaceholders(patterns);
			if (!failedDependencies(processed).length || attempt === maxAttempts) {
				return processed;
			}
		} catch (error) {
			if (attempt === maxAttempts) {
				console.error(
					`Failed to process patterns after ${maxAttempts} attempts:`,
					error,
				);
				return patterns;
			}
		}

		await sleep(delay);
	}
};
