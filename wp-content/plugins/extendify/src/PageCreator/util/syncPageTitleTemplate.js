import { updatePageTitlePattern } from '@page-creator/api/WPApi';
import apiFetch from '@wordpress/api-fetch';
import { decodeEntities } from '@wordpress/html-entities';

/**
 * Overwrite the theme’s default “page-with-title” template with the
 * stored page-title pattern, but only if the template has never been
 */
export const syncPageTitleTemplate = async (pageTitlePattern) => {
	if (!pageTitlePattern) return;

	const tpl = await apiFetch({
		path: '/wp/v2/templates/extendable//page-with-title',
	});

	if (tpl.source === 'theme') {
		await updatePageTitlePattern(decodeEntities(pageTitlePattern));
	}
};
