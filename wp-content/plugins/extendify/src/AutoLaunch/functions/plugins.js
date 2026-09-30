import { recordPluginActivity } from '@shared/api/DataApi';
import { digest } from '@shared/api/digest';
import { enableAutoUpdate } from '@shared/api/wp';
import {
	failedDependencies,
	processWithSecondPass,
} from '@shared/lib/patterns';
import apiFetch from '@wordpress/api-fetch';
import { addQueryArgs } from '@wordpress/url';

export const getActivePlugins = () =>
	apiFetch({ path: 'extendify/v1/auto-launch/active-plugins' });

export const alreadyActive = (activePlugins, pluginSlug) =>
	activePlugins?.filter((p) => p.includes(pluginSlug))?.length;

// WP unpacks every install through one shared dir; two at once corrupt both.
let installQueue = Promise.resolve();

// Re-installing is not free: WP unpacks before it finds the folder exists.
const installed = new Map();

const enqueue = (task) => {
	const result = installQueue.then(task);
	installQueue = result.catch(() => {});
	return result;
};

const INSTALL_DRAIN_MS = 60_000;

// The install POST has no timeout; uncapped, one stall parks the build.
const waitForInstalls = () => {
	let timer;
	return Promise.race([
		installQueue,
		new Promise((resolve) => {
			timer = setTimeout(resolve, INSTALL_DRAIN_MS);
		}),
	]).finally(() => clearTimeout(timer));
};

const install = async (slug) => {
	const fn = async () => {
		const p = await apiFetch({
			path: '/wp/v2/plugins',
			method: 'POST',
			data: { slug },
		});
		// Unawaited: no timeout on these, and a stall would hold the queue.
		recordPluginActivity({ slug, source: 'auto-launch' });
		enableAutoUpdate(p?.plugin);
		return p;
	};
	try {
		return await fn();
	} catch (error) {
		if (error?.code === 'folder_exists') {
			// Already on disk — fetch its record so the caller can activate it.
			return await getPlugin(slug);
		}
		try {
			return await fn();
		} catch (error) {
			digest({
				error,
				details: { source: 'auto-launch', caller: 'installPlugin' },
			});
			return null;
		}
	}
};

export const installPlugin = (slug) =>
	enqueue(async () => {
		const known = installed.get(slug);
		if (known) return { plugin: known };

		const plugin = await install(slug);
		if (plugin?.plugin) installed.set(slug, plugin.plugin);
		return plugin;
	});

export const getPlugin = async (slug) => {
	const response = await apiFetch({
		path: addQueryArgs('/wp/v2/plugins', { search: slug }),
	});
	return response?.find((p) => p.plugin?.split('/')[0] === slug);
};

export const activatePlugin = async (slug) => {
	const fn = (s) =>
		apiFetch({
			path: `/wp/v2/plugins/${s}`,
			method: 'POST',
			data: { status: 'active' },
		});

	try {
		await fn(slug);
		return true;
	} catch (_) {
		try {
			// try once more but get the slug first
			const { plugin } = await getPlugin(slug);
			await fn(plugin);
			return true;
		} catch (error) {
			digest({
				error,
				details: { source: 'auto-launch', caller: 'activatePlugin' },
			});
			return false;
		}
	}
};

// Exact match, not substring: woocommerce-payments would mask a missing woocommerce.
const notActive = (activePlugins, slugs) =>
	slugs.filter(
		(slug) => !activePlugins?.some((path) => path.split('/')[0] === slug),
	);

export const ensurePluginsActive = async (slugs) => {
	// Two callers don't await this; a throw here silently skips every install.
	const active = await getActivePlugins().catch((error) => {
		digest({
			error,
			details: { source: 'auto-launch', caller: 'ensurePluginsActive' },
		});
		return [];
	});
	const missing = notActive(active, slugs);
	if (!missing.length) return { failed: [] };

	const onDisk = window.extSharedData?.installedPluginsSlugs ?? [];
	const failed = [];
	for (const slug of missing) {
		try {
			const plugin = onDisk.includes(slug) ? null : await installPlugin(slug);
			const activated = await activatePlugin(plugin?.plugin ?? slug);
			if (!activated) failed.push(slug);
		} catch (_) {
			failed.push(slug);
		}
	}
	return { failed };
};

export const reportInactivePlugins = async (slugs) => {
	// Falling back to an empty list would name every plugin as inactive.
	const active = await getActivePlugins().catch(() => null);
	if (!active) return;

	const inactive = notActive(active, slugs);
	if (!inactive.length) return;

	digest({
		error: { message: `Plugins inactive after launch: ${inactive.join(', ')}` },
		details: {
			source: 'auto-launch',
			caller: 'reportInactivePlugins',
			inactive,
		},
	});
};

export const reportFailedDependencies = (pages) => {
	const failed = [
		...new Set(pages.flatMap(({ patterns }) => failedDependencies(patterns))),
	];
	if (!failed.length) return;

	digest({
		error: {
			message: `Patterns left static after a failed dependency: ${failed.join(', ')}`,
		},
		details: {
			source: 'auto-launch',
			caller: 'reportFailedDependencies',
			failed,
		},
	});
};

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
			source: 'auto-launch',
		});
	}

	return await processWithSecondPass(processPlaceholders, patterns);
};

// This endpoint installs pattern dependencies from PHP, outside the queue.
export const processPlaceholders = async (patterns) => {
	await waitForInstalls();
	return apiFetch({
		path: '/extendify/v1/shared/process-placeholders',
		method: 'POST',
		data: { patterns },
	});
};
