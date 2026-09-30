import { getLogoShape } from '@auto-launch/fetchers/shape';
import {
	failWithFallback,
	fetchWithTimeout,
	retryTwice,
	setStatus,
} from '@auto-launch/functions/helpers';
import { updateOption } from '@auto-launch/functions/wp';
import { launchStrings } from '@auto-launch/strings';
import { AI_HOST } from '@constants';
import { digest } from '@shared/api/digest';
import { reqDataBasics } from '@shared/lib/data';
import { uploadMedia } from '@wordpress/media-utils';

const { showAILogo } = window.extSharedData;
const fallback = {
	logoUrl:
		'https://images.extendify-cdn.com/demo-content/logos/ext-custom-logo-default.webp',
};
const url = `${AI_HOST}/api/site-profile/generate-logo`;
const method = 'POST';
const headers = { 'Content-Type': 'application/json' };

export const handleSiteLogo = async ({ siteProfile }) => {
	if (!showAILogo) return fallback;

	// translators: this is for a action log UI. Keep it short
	setStatus(launchStrings().statusLogo);

	const { logoObjectName: objectName } = siteProfile;
	const body = JSON.stringify({ ...reqDataBasics, objectName });
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
			details: { source: 'auto-launch', caller: 'handleSiteLogo', objectName },
		});
		return fallback;
	}

	const logoUrl = await failWithFallback(
		async () => {
			const { logoUrl } = getLogoShape.parse(await response.json());
			return logoUrl;
		},
		fallback.logoUrl,
		{ caller: 'handleSiteLogo' },
	);

	// If this errors we just move on.
	await uploadLogo(logoUrl);

	return getLogoShape.parse({ logoUrl });
};

// The backend serves the real brand logo from a `logos-custom/` path; other
// logos keep the duotone-prefixed upload name.
export const isExternalLogo = (url) => url?.includes('logos-custom/') ?? false;

export const uploadLogo = async (url, { external = false } = {}) => {
	const blob = await (await fetch(url)).blob();
	const type = blob.type;
	const fileExtension = type.replace('image/', '');
	const prefix = external ? 'ext-logo-' : 'ext-custom-logo-';
	const logoName = `${prefix}${Date.now()}`;
	const image = new File([blob], `${logoName}.${fileExtension}`, { type });

	await uploadMedia({
		filesList: [image],
		onFileChange: async ([fileObj]) => {
			if (!fileObj?.id) return;
			await updateOption('site_logo', fileObj.id);
		},
		onError: (err) => {
			console.error('Error uploading logo:', err);
			digest({
				error: err,
				details: { source: 'auto-launch', caller: 'uploadLogo' },
			});
		},
	});
};
