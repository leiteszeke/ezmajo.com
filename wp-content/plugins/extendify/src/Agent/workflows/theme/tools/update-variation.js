import { appliedVibeOwnership } from '@shared/lib/applied-vibes';
import { deepMerge } from '@shared/lib/utils';
import {
	preserveVibeSettings,
	preserveVibeStyles,
} from '@shared/lib/vibe-globals';
import apiFetch from '@wordpress/api-fetch';

const { globalStylesPostID } = window.extSharedData;

// The vibe layer keeps its owned leaves even when the variation declares them.
export default async ({ variation, purge = (document) => document }) => {
	const [current, vibes] = await Promise.all([
		apiFetch({
			path: `/wp/v2/global-styles/${globalStylesPostID}?context=edit`,
		}),
		getCurrentVibes(),
	]);

	const merged = deepMerge(
		purge({ settings: current.settings, styles: current.styles }),
		variation,
	);

	return apiFetch({
		method: 'POST',
		path: `/wp/v2/global-styles/${globalStylesPostID}`,
		data: {
			id: globalStylesPostID,
			settings: preserveVibeSettings({
				mergedSettings: merged.settings,
				currentSettings: current.settings,
				vibes,
			}),
			styles: preserveVibeStyles({
				mergedStyles: merged.styles,
				currentStyles: current.styles,
				vibes,
			}),
		},
	});
};

const getCurrentVibes = async () => {
	try {
		const { data } = await apiFetch({
			path: '/extendify/v1/launch/options?option=extendify_siteStyle',
		});
		return await appliedVibeOwnership(data?.vibe);
	} catch {
		return {};
	}
};
