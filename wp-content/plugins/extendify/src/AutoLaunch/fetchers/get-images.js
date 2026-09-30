import { getImagesShape } from '@auto-launch/fetchers/shape';
import { collectBuiltPageImageUrls } from '@auto-launch/functions/get-imported-images';
import {
	failWithFallback,
	fetchWithTimeout,
	retryTwice,
	setStatus,
} from '@auto-launch/functions/helpers';
import { launchStrings } from '@auto-launch/strings';
import { IMAGES_HOST } from '@constants';
import { reqDataBasics } from '@shared/lib/data';

const fallback = { siteImages: { hero: [], general: [] } };
const url = `${IMAGES_HOST}/api/images`;
const { wpLanguage } = window.extSharedData;
const method = 'POST';
const headers = { 'Content-Type': 'application/json' };
// A shipped build can never change a count it sends; the service can.
const imageTypes = [{ type: 'hero' }, { type: 'general' }];
const MIN_POOL_SIZE = 10;

const asImages = (urls) => urls.map((link) => ({ url: link }));
// The build's reusable images exclude its hero, so they are section photos.
const asSections = (urls) => ({ hero: [], general: asImages(urls) });

export const handleSiteImages = async ({ siteProfile, designBuild }) => {
	// translators: this is for a action log UI. Keep it short
	setStatus(launchStrings().statusImages);

	// Reuse the design preview's own images; only search for what is missing.
	const seeded = collectBuiltPageImageUrls(designBuild?.builtPages);
	if (seeded.length >= MIN_POOL_SIZE) return { siteImages: asSections(seeded) };

	const body = JSON.stringify({
		...reqDataBasics,
		siteProfile,
		lang: wpLanguage,
		imageTypes,
		source: 'auto-launch',
	});

	const response = await retryTwice(() =>
		fetchWithTimeout(url, { method, headers, body }),
	);

	if (!response?.ok) return { siteImages: asSections(seeded) };

	const { siteImages: found } = await failWithFallback(
		async () => {
			const { images } = await response.json();
			return getImagesShape.parse({ siteImages: images });
		},
		fallback,
		{ caller: 'handleSiteImages' },
	);

	if (!seeded.length) return { siteImages: found };

	const seededSet = new Set(seeded);
	const topup = found.general
		.filter((image) => !seededSet.has(image.url))
		.slice(0, MIN_POOL_SIZE - seeded.length);
	return {
		siteImages: { hero: found.hero, general: [...asImages(seeded), ...topup] },
	};
};
