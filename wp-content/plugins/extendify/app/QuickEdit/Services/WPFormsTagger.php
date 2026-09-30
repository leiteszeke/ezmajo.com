<?php

namespace Extendify\QuickEdit\Services;

defined('ABSPATH') || die('No direct access.');

use Extendify\Config;

// Field id parses come from WPForms' DOM id format
// (`wpforms-{formId}-field_{fieldId}-container`); parsing the rendered
// HTML is more stable than reaching into the form's serialized JSON.
class WPFormsTagger
{
    // phpcs:ignore PSR12.Properties.ConstantVisibility.NotFound -- 7.0 floor: no const visibility
    const ATTR_FORM_ID = 'data-extendify-quick-edit-wpform-id';
    // phpcs:ignore PSR12.Properties.ConstantVisibility.NotFound -- 7.0 floor: no const visibility
    const ATTR_FIELD_ID = 'data-extendify-quick-edit-wpform-field-id';

    public static function init()
    {
        if (is_admin()) {
            return;
        }
        add_filter('render_block', [self::class, 'onRenderBlock'], 11, 2);
    }

    public static function onRenderBlock($html, $block)
    {
        if (!is_string($html) || $html === '') {
            return $html;
        }
        $name = $block['blockName'] ?? '';
        if ($name !== 'wpforms/form-selector') {
            return $html;
        }
        if (!is_user_logged_in() || !current_user_can(Config::$requiredCapability)) {
            return $html;
        }

        if (!preg_match('/<form[^>]*\bid="wpforms-form-(\d+)"/', $html, $m)) {
            return $html;
        }
        $formId = (int) $m[1];
        if ($formId <= 0) {
            return $html;
        }

        $html = preg_replace_callback(
            '/<form\b([^>]*\bid="wpforms-form-' . $formId . '"[^>]*)>/',
            function ($mm) use ($formId) {
                if (str_contains($mm[1], self::ATTR_FORM_ID)) {
                    return $mm[0];
                }
                return '<form' . $mm[1] . ' '
                    . self::ATTR_FORM_ID . '="' . $formId . '">';
            },
            $html,
            1
        );

        $html = preg_replace_callback(
            '/<div\b([^>]*\bid="wpforms-' . $formId . '-field_(\d+)-container"[^>]*)>/',
            function ($mm) {
                $fieldId = (int) $mm[2];
                if (str_contains($mm[1], self::ATTR_FIELD_ID)) {
                    return $mm[0];
                }
                return '<div' . $mm[1] . ' '
                    . self::ATTR_FIELD_ID . '="' . $fieldId . '">';
            },
            $html
        );

        return $html;
    }
}
