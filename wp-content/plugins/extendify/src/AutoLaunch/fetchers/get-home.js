import {
	applyDesignBuildHero,
	applyDesignBuildNav,
} from '@auto-launch/fetchers/get-design-build';
import { getHomeShape, homeTemplateShape } from '@auto-launch/fetchers/shape';
import {
	fetchWithTimeout,
	retryTwice,
	setStatus,
} from '@auto-launch/functions/helpers';
import { getHeadersAndFooters } from '@auto-launch/functions/wp';
import { launchStrings } from '@auto-launch/strings';
import { PATTERNS_HOST } from '@constants';
import { digest } from '@shared/api/digest';
import { reqDataBasics } from '@shared/lib/data';
import { siteImageUrlsByType } from '@shared/lib/site-images';

const url = `${PATTERNS_HOST}/api/home`;
const { wpLanguage, showImprint } = window.extSharedData;
const method = 'POST';
const headers = { 'Content-Type': 'application/json' };

export const handleHome = async ({
	siteProfile,
	sitePlugins,
	siteImages,
	aiHeaders,
	designBuild,
}) => {
	// translators: this is for a action log UI. Keep it short
	setStatus(launchStrings().statusHome);

	// A full-page design build already carries the whole home; skip the
	// /api/home fetch and build the page from the built patterns directly.
	const builtHome = designBuild?.builtPages?.find((p) => p.slug === 'home');
	if (builtHome?.fullPage && builtHome.patterns?.length) {
		// The full page is final — keep the BE's sections verbatim and flag them
		// so generatePageContent skips the /api/patterns rewrite.
		const patterns = builtHome.patterns.map((p) => ({
			...p,
			contentGenerated: true,
		}));
		const parts = await resolveTemplateParts({ siteProfile, designBuild });
		return getHomeShape.parse({
			home: { id: 'home', slug: 'home', patterns, ...parts },
		});
	}

	const body = JSON.stringify({
		...reqDataBasics,
		siteProfile,
		siteImages: siteImageUrlsByType(siteImages),
		sitePlugins,
		aiHeaders,
		// If pages are passed in they may be used
		pages: designBuild?.pages ?? [],
		buildId: designBuild?.buildId,
	});

	const response = await retryTwice(() =>
		fetchWithTimeout(url, { method, headers, body }),
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
			details: { source: 'auto-launch', caller: 'handleHome' },
		});
		throw new Error(response.statusText);
	}

	const template = homeTemplateShape.parse(await response.json());
	template.patterns = applyDesignBuildNav(
		template.patterns,
		designBuild,
		siteProfile.structure,
	);
	template.patterns = applyDesignBuildHero(template.patterns, designBuild);

	const parts = await resolveTemplateParts({ siteProfile, designBuild });
	return getHomeShape.parse({ home: { ...template, ...parts } });
};

const resolveTemplateParts = async ({ siteProfile, designBuild }) => {
	const headerPart = designBuild?.templateParts?.header;
	const footerPart = designBuild?.templateParts?.footer;
	// Both parts came from the design build; skip the template-parts fetch.
	if (headerPart && footerPart)
		return { headerCode: headerPart, footerCode: footerPart };

	const hasFooterNav = Array.isArray(showImprint)
		? showImprint.includes(wpLanguage ?? '') &&
			siteProfile.category === 'Business'
		: false;

	const { headers: head, footers: foot } = await getHeadersAndFooters({
		useNavFooter: hasFooterNav,
	});
	const randomHeader = head[Math.floor(Math.random() * head.length)];
	const randomFooter = foot[Math.floor(Math.random() * foot.length)];
	return {
		headerCode: headerPart ?? randomHeader?.content?.raw?.trim() ?? '',
		footerCode: footerPart ?? randomFooter?.content?.raw?.trim() ?? '',
	};
};
