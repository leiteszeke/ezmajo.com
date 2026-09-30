<?php

namespace Extendify\QuickEdit\Services;

defined('ABSPATH') || die('No direct access.');

// Whether the current front-end render shows a non-default-language
// translation, across TranslatePress / WPML / Polylang. Quick Edit writes to
// the source post_content, so on a translated render the on-screen text is the
// translation while the save target is the source — editing text there would
// overwrite the source with the wrong language. This is detection only; the
// shape ships to the client as extQuickEditData.translatedContext and the
// save-side guard lives in the SaveController (see the QE context-guards plan).
class TranslatedContext
{
    // ['isTranslated' => bool, 'plugin' => 'translatepress'|'wpml'|'polylang'|null].
    // First plugin reporting current-language != default-language wins; 'plugin'
    // is the name to surface in the "manage translations in <plugin>" message.
    public static function detect(): array
    {
        if (self::translatePressIsTranslated()) {
            return ['isTranslated' => true, 'plugin' => 'translatepress'];
        }

        if (self::wpmlIsTranslated()) {
            return ['isTranslated' => true, 'plugin' => 'wpml'];
        }

        if (self::polylangIsTranslated()) {
            return ['isTranslated' => true, 'plugin' => 'polylang'];
        }

        return ['isTranslated' => false, 'plugin' => null];
    }

    private static function translatePressIsTranslated(): bool
    {
        $settings = get_option('trp_settings');
        if (!is_array($settings) || empty($settings['default-language'])) {
            return false;
        }

        // TranslatePress resolves the request's language into this global (a
        // locale like 'es_ES') by the time scripts enqueue; on the default
        // language it equals settings['default-language'].
        $current = isset($GLOBALS['TRP_LANGUAGE']) ? (string) $GLOBALS['TRP_LANGUAGE'] : '';
        if ($current === '') {
            return false;
        }

        return $current !== (string) $settings['default-language'];
    }

    private static function wpmlIsTranslated(): bool
    {
        // WPML's own public API for the active/default language — these are its
        // hooks, not ones we register, so the plugin-prefix rule doesn't apply.
        // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedHooknameFound
        $current = apply_filters('wpml_current_language', null);
        // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedHooknameFound
        $default = apply_filters('wpml_default_language', null);
        if (!is_string($current) || !is_string($default) || $current === '' || $default === '') {
            return false;
        }

        return $current !== $default;
    }

    private static function polylangIsTranslated(): bool
    {
        if (!function_exists('pll_current_language') || !function_exists('pll_default_language')) {
            return false;
        }

        $current = pll_current_language('slug');
        $default = pll_default_language('slug');
        if (!$current || !$default) {
            return false;
        }

        return $current !== $default;
    }
}
