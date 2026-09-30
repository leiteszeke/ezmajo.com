import { getStyleDocument } from '@auto-launch/fetchers/get-style-document';
import { getStyleShape, styleShape } from '@auto-launch/fetchers/shape';
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
import { z } from 'zod';

const fallback = { siteStyle: {} };
const url = `${AI_HOST}/api/style-recipes`;
const method = 'POST';
const headers = { 'Content-Type': 'application/json' };

// The styles route serves no global-styles document.
const shapeLocal = z.array(styleShape.omit({ variation: true }));

export const handleSiteStyle = async ({ siteProfile }) => {
	// translators: this is for a action log UI. Keep it short
	setStatus(launchStrings().statusStyle);

	const body = JSON.stringify({ ...reqDataBasics, siteProfile, count: 1 });

	const response = await retryTwice(() =>
		fetchWithTimeout(url, { method, headers, body }, 20_000),
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
			details: { source: 'auto-launch', caller: 'handleSiteStyle' },
		});
		return fallback;
	}

	return failWithFallback(
		async () => {
			const data = await response.json();
			const style = shapeLocal.parse(data)[0];
			const variation = await getStyleDocument({
				colorPalette: style.colorPalette,
				fonts: style.fonts,
			});
			const siteStyle = { ...style, variation };
			// The Agent reads extendify_siteStyle; the legacy row keeps old readers.
			await updateOption('extendify_siteStyle', siteStyle);
			await updateOption('extendify_site_style', siteStyle);
			// Set animation default
			await updateOption('extendify_animation_settings', {
				type: style.animation ?? 'fade',
				speed: 'medium',
			});
			return getStyleShape.parse({ siteStyle });
		},
		fallback,
		{ caller: 'handleSiteStyle' },
	);
};
