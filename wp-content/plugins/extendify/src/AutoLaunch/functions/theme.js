import apiFetch from '@wordpress/api-fetch';
import { dispatch, select } from '@wordpress/data';
import { __ } from '@wordpress/i18n';

const { globalStylesPostID } = window.extSharedData;

export const updateVariation = (variation) =>
	updateThemeVariation(globalStylesPostID, variation);

export const updateThemeVariation = (id, variation = {}) => {
	const { settings, styles } = variation;
	if (!settings || !styles) return;
	return apiFetch({
		path: `wp/v2/global-styles/${id}`,
		method: 'POST',
		data: { id, settings, styles },
	});
};

export const updateGlobalStyles = (stylesData) =>
	apiFetch({
		path: `wp/v2/global-styles/${globalStylesPostID}`,
		method: 'POST',
		data: stylesData,
	});

export const getGlobalStyles = () =>
	apiFetch({ path: `wp/v2/global-styles/themes/extendable?context=edit` });

export const updateTemplatePart = (slug, content) =>
	apiFetch({
		path: `wp/v2/template-parts/${slug}`,
		method: 'POST',
		data: {
			slug,
			theme: 'extendable',
			type: 'wp_template_part',
			status: 'publish',
			// See: https://github.com/extendify/company-product/issues/833#issuecomment-1804179527
			// translators: Launch is the product name. Unless otherwise specified by the glossary, do not translate this name.
			description: __('Added by Launch', 'extendify-local'),
			content,
		},
	});

// We set this to 'template-locked' to remove template from editor ui
export const setThemeRenderingMode = (mode) => {
	const renderingModes =
		select('core/preferences').get('core', 'renderingModes') || {};

	if (renderingModes?.extendable?.page === mode) return;
	dispatch('core/preferences').set('core', 'renderingModes', {
		...renderingModes,
		extendable: {
			...(renderingModes.extendable || {}),
			page: mode,
		},
	});
};
