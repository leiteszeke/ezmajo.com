<?php

/**
 * Build-time URL rewrites (.github/workflows/build-*-zip.yml) target this file,
 * so any new PHP code that consumes these constants inherits the override.
 */

namespace Extendify;

defined('ABSPATH') || die('No direct access.');

class Constants
{
    // Plugin requires PHP 7.0; constant visibility modifiers are PHP 7.1+.
    // phpcs:disable PSR12.Properties.ConstantVisibility.NotFound
    const AI_HOST = 'https://ai.extendify.com';
    const PATTERNS_HOST = 'https://patterns.extendify.com';
    const KB_HOST = 'https://kb.extendify.com';
    const INSIGHTS_HOST = 'https://insights.extendify.com';
    const IMAGES_HOST = 'https://images-resource.extendify.com';
    const DASHBOARD_HOST = 'https://dashboard.extendify.com';
    // phpcs:enable PSR12.Properties.ConstantVisibility.NotFound

    /**
     * All Extendify service base URLs.
     *
     * @return string[]
     */
    public static function serviceUrls()
    {
        return [
            self::AI_HOST,
            self::PATTERNS_HOST,
            self::KB_HOST,
            self::INSIGHTS_HOST,
            self::IMAGES_HOST,
            self::DASHBOARD_HOST,
        ];
    }
}
