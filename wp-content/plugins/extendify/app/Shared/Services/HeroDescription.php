<?php

/**
 * The HeroDescription class
 */

namespace Extendify\Shared\Services;

defined('ABSPATH') || die('No direct access.');

use Extendify\Constants;

/**
 * Reads the sentence used as the hero paragraph of a generated design.
 */

class HeroDescription
{
    /**
     * The description to write into a hero pattern, or an empty string.
     *
     * @param mixed $description - The description sent with the request.
     * @return string
     */
    public static function resolve($description = null)
    {
        // The request reads the live hero, so it beats an option gone stale.
        $description = self::text($description);
        if ($description !== '') {
            return $description;
        }

        $stored = self::text(\get_option('extendify_hero_description', ''));
        if ($stored !== '') {
            return $stored;
        }

        return self::refresh();
    }

    /**
     * Build a sentence from the site profile, the only source on older sites.
     *
     * @return string
     */
    private static function refresh()
    {
        $siteProfile = \get_option('extendify_site_profile', []);
        if (empty($siteProfile)) {
            return '';
        }

        $response = HttpClient::post(
            Constants::AI_HOST . '/api/site-strings',
            ['params' => ['siteProfile' => $siteProfile]],
            null,
            true
        );

        $description = self::text($response['response']['heroDescription'] ?? '');
        if ($description === '') {
            // Leave the option unset so a failed reply retries on the next open.
            return '';
        }

        \update_option('extendify_hero_description', Sanitizer::sanitizeText($description));
        return $description;
    }

    /**
     * A trimmed string, whatever the value was.
     *
     * @param mixed $value - The value to read.
     * @return string
     */
    private static function text($value)
    {
        return is_string($value) ? trim($value) : '';
    }
}
