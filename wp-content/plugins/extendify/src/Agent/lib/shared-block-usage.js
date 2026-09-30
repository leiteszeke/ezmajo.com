import apiFetch from '@wordpress/api-fetch';
import { __, _n, sprintf } from '@wordpress/i18n';
import { addQueryArgs } from '@wordpress/url';

// A composite id names another post, so saving reaches every page rendering it.
const COMPOSITE_ID_RX = /^(?:part:[^:]+:)?(?:block|navigation):\d+:\d+$/;

export const isSharedBlockId = (blockId) =>
	COMPOSITE_ID_RX.test(String(blockId ?? ''));

export const fetchSharedBlockUsage = async (blockId) => {
	if (!isSharedBlockId(blockId)) return null;
	const response = await apiFetch({
		path: addQueryArgs('/extendify/v1/agent/shared-block-usage', {
			blockId: String(blockId).replace(/^part:[^:]+:/, ''),
		}),
	});
	if (!response?.scope || response.scope === 'block') return null;
	return response;
};

// The current page is already on screen, so naming it tells the user nothing.
const otherPages = (pages) => {
	const current = Number(window.extAgentData?.context?.postId || 0);
	return (Array.isArray(pages) ? pages : []).filter(({ id }) => id !== current);
};

export const sharedBlockNotice = (usage) => {
	if (!usage) return null;
	if (usage.scope === 'site') {
		return __(
			'This content is shared across your site, so saving changes it on every page.',
			'extendify-local',
		);
	}

	const pages = otherPages(usage.pages);
	if (!pages.length) return null;

	if (pages.length === 1) {
		return sprintf(
			// translators: %s is the name of another page that shows the same content.
			__('Saving also changes this content on %s.', 'extendify-local'),
			pages[0].title,
		);
	}

	return sprintf(
		// translators: %d is how many other pages show the same content.
		_n(
			'Saving also changes this content on %d other page.',
			'Saving also changes this content on %d other pages.',
			pages.length,
			'extendify-local',
		),
		pages.length,
	);
};
