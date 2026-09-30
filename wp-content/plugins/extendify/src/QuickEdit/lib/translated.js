import { __, sprintf } from '@wordpress/i18n';

// Block types whose primary edited value is human-readable, translatable text.
// On a non-default-language render Quick Edit writes the source post_content
// while the screen shows the translation, so these are blocked and a notice is
// shown instead. Image, color, alignment, price, and link edits touch shared
// (untranslated) source and stay available — deliberately absent here.
const TEXT_BEARING_BLOCK_TYPES = new Set([
	'core/paragraph',
	'core/heading',
	'core/button',
	'core/site-title',
	'core/site-tagline',
	'core/navigation-link',
	'core/navigation-submenu',
	'product:name',
	'product:short_description',
	'product:description',
]);

export const isTextBearing = (blockType) =>
	TEXT_BEARING_BLOCK_TYPES.has(blockType);

const PLUGIN_LABELS = {
	translatepress: 'TranslatePress',
	wpml: 'WPML',
	polylang: 'Polylang',
};

export const translatedNoticeMessage = (plugin) => {
	const label = PLUGIN_LABELS[plugin];
	if (!label) {
		return __(
			"Quick Edit can't edit translated content on this page.",
			'extendify-local',
		);
	}
	return sprintf(
		// translators: %s is the multilingual plugin name, e.g. "TranslatePress".
		__(
			"Quick Edit can't edit translated content — manage translations in %s.",
			'extendify-local',
		),
		label,
	);
};

// Detected server-side at page render (Frontend::enqueue, where the request
// language is known) and shipped on the inline-script global. The REST save
// request isn't language-scoped, so the save guard reads the value the client
// forwards rather than re-detecting. Shape:
// { isTranslated: boolean, plugin: 'translatepress'|'wpml'|'polylang'|null }.
export const getTranslatedContext = () =>
	window.extQuickEditData?.translatedContext ?? null;

export const isTranslatedRender = () => !!getTranslatedContext()?.isTranslated;
