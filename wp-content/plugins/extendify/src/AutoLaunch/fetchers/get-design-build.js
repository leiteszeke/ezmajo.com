import { isExternalLogo, uploadLogo } from '@auto-launch/fetchers/get-logo';
import { getStyleDocument } from '@auto-launch/fetchers/get-style-document';
import {
	getDesignBuildShape,
	getLogoShape,
	getPluginsShape,
	getStyleShape,
} from '@auto-launch/fetchers/shape';
import { importBuiltPagesImages } from '@auto-launch/functions/get-imported-images';
import {
	fetchWithTimeout,
	retryTwice,
	setStatus,
} from '@auto-launch/functions/helpers';
import { updateOption } from '@auto-launch/functions/wp';
import { useLaunchDataStore } from '@auto-launch/state/launch-data';
import { launchStrings } from '@auto-launch/strings';
import { AI_HOST } from '@constants';
import { digest } from '@shared/api/digest';
import { mutate } from 'swr';

const fallback = null;
const headers = { 'Content-Type': 'application/json' };

// Left set, the launch screen waits forever on a design that never arrives.
const dropBuildId = () =>
	useLaunchDataStore.setState((s) => ({
		urlParams: { ...s.urlParams, 'build-id': '' },
	}));

export const handleDesignBuild = async ({ urlParams }) => {
	const buildId = urlParams?.['build-id'];
	if (!buildId) return fallback;

	// translators: this is for a action log UI. Keep it short
	setStatus(launchStrings().statusDesign);

	const url = `${AI_HOST}/api/design/${encodeURIComponent(buildId)}`;
	const response = await retryTwice(() =>
		fetchWithTimeout(url, { headers }),
	).catch((error) => {
		return { ok: false, statusText: error.message, status: 0 };
	});

	if (!response?.ok) {
		digest({
			error: {
				message: response.statusText,
				name: 'FetchError',
				status: response.status,
			},
			details: { source: 'auto-launch', caller: 'handleDesignBuild' },
		});
		dropBuildId();
		return fallback;
	}

	try {
		const parsed = getDesignBuildShape.parse(await response.json());

		// Stash the site profile
		const profile = parsed.siteProfile;
		await updateOption('extendify_site_profile', JSON.stringify(profile));
		mutate('siteProfile', { siteProfile: profile }, false);

		const style = parsed.siteStyle;
		const variation = await getStyleDocument({
			colorPalette: style.colorPalette,
			fonts: style.fonts,
		});
		const siteStyle = { ...style, variation };
		// The Agent reads extendify_siteStyle; the legacy row keeps old readers.
		await updateOption('extendify_siteStyle', siteStyle);
		await updateOption('extendify_site_style', siteStyle);
		await updateOption('extendify_animation_settings', {
			type: style.animation ?? 'fade',
			speed: 'medium',
		});
		mutate('siteStyle', getStyleShape.parse({ siteStyle }), false);

		// Stash the plugins
		const sitePlugins = parsed.selectedPlugins;
		mutate('sitePlugins', getPluginsShape.parse({ sitePlugins }), false);

		// The logo upload swaps logoUrl for a Media Library URL without the
		// logos-custom/ marker, so capture "is the brand's own logo" from the
		// source URL now.
		const hasExternalLogo = isExternalLogo(parsed.logoUrl);

		// Sideload the built-page images, and upload the logo alongside when the
		// build provided one. logoUrl is nullable; without it we skip the upload
		// so the siteLogo step falls through to AI logo generation.
		const uploads = [importBuiltPagesImages(parsed.builtPages)];
		if (parsed.logoUrl) {
			mutate(
				'siteLogo',
				getLogoShape.parse({ logoUrl: parsed.logoUrl }),
				false,
			);
			uploads.push(uploadLogo(parsed.logoUrl, { external: hasExternalLogo }));
		}
		const [builtPages] = await Promise.all(uploads);

		const designBuild = {
			buildId,
			...parsed,
			builtPages,
			hasExternalLogo,
			siteProfile: profile,
			siteStyle,
		};
		// Exclude `pages` from the spread: the pages step owns it (templates with
		// patterns); designBuild.pages (slug/name only) would clobber it.
		const { pages, ...topLevel } = designBuild;
		return { designBuild, ...topLevel };
	} catch (e) {
		digest({
			error: e,
			details: { source: 'auto-launch', caller: 'handleDesignBuild::parsing' },
		});
		console.error('handleDesignBuild:', e);
		dropBuildId();
		return fallback;
	}
};

// Prepend the design build's hero to the fetched home template. Full-page
// builds skip /api/home entirely and are assembled in handleHome.
export const applyDesignBuildHero = (patterns, designBuild) => {
	const builtHome = designBuild?.builtPages?.find((p) => p.slug === 'home');
	if (!builtHome?.patterns?.length) return patterns;
	return [...builtHome.patterns, ...patterns];
};

// /api/home answers a locked nav with one section per entry, in order, and holds back
// the hero, so a count mismatch means that broke: leave the names to the pattern types.
export const applyDesignBuildNav = (patterns, designBuild, structure) => {
	const pages = designBuild?.pages ?? [];
	if (structure !== 'single-page' || patterns.length !== pages.length) {
		return patterns;
	}

	return patterns.map((pattern, i) => ({ ...pattern, navSlug: pages[i].slug }));
};

// Reorder pages to match the design build's page order; extras fall to the end.
export const applyDesignBuildOrder = (pages, designBuild) => {
	const order = designBuild?.pages?.map((p) => p.slug) ?? [];
	if (!order.length) return pages;
	return [
		...order.map((slug) => pages.find((t) => t.slug === slug)).filter(Boolean),
		...pages.filter((t) => !order.includes(t.slug)),
	];
};
