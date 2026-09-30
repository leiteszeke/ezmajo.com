import { getProfileShape } from '@auto-launch/fetchers/shape';
import { fetchWithTimeout, setStatus } from '@auto-launch/functions/helpers';
import { updateOption } from '@auto-launch/functions/wp';
import { overrideWithUrlParams } from '@auto-launch/state/url-params';
import { launchStrings } from '@auto-launch/strings';
import { AI_HOST } from '@constants';
import { reqDataBasics } from '@shared/lib/data';
import { z } from 'zod';

const localShape = z.object({
	siteProfile: getProfileShape,
});

// No fallback here as we need this data
const url = `${AI_HOST}/api/site-profile`;
const method = 'POST';
const headers = { 'Content-Type': 'application/json' };

export const handleSiteProfile = async ({
	title,
	descriptionRaw,
	urlParams,
}) => {
	// translators: this is for a action log UI. Keep it short
	setStatus(launchStrings().statusProfile);

	const body = JSON.stringify({
		...reqDataBasics,
		title: title || window.extSharedData.siteTitle,
		description: descriptionRaw,
		autoLaunch: true,
	});
	const response = await fetchWithTimeout(
		url,
		{ method, headers, body },
		20_000,
	);

	// This should throw rather than have a fallback
	if (!response?.ok) throw new Error('Failed to fetch site profile');

	// TODO: pull out followups here and save them for AI follow ups
	const { profile: p } = await response.json();
	const profile = getProfileShape.parse(p);
	// Overwrite with a few url params if provided
	const profileWIthUrlOverrides = {
		...profile,
		...overrideWithUrlParams(urlParams),
		descriptionRaw, // Add the raw description to profile
	};

	await updateOption(
		'extendify_site_profile',
		JSON.stringify(profileWIthUrlOverrides),
	);
	return localShape.parse({ siteProfile: profileWIthUrlOverrides });
};
