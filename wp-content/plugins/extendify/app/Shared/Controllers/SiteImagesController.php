<?php

/**
 * Controls cached site images
 */

namespace Extendify\Shared\Controllers;

defined('ABSPATH') || die('No direct access.');

use Extendify\Constants;
use Extendify\Shared\Services\HttpClient;
use Extendify\Shared\Services\Sanitizer;
use Extendify\Shared\Services\SiteImages;

/**
 * The controller for the persisted site images cache
 */

class SiteImagesController
{
    /**
     * Return cached site images, lazy-fetching from the images service when missing.
     *
     * @return \WP_REST_Response
     */
    public static function get()
    {
        $siteImages = \get_option('extendify_site_images', []);

        if (!empty($siteImages)) {
            return new \WP_REST_Response(['siteImages' => SiteImages::normalize($siteImages)]);
        }

        return new \WP_REST_Response(['siteImages' => self::refresh()]);
    }

    /**
     * Persist a provided site images array.
     *
     * @param \WP_REST_Request $request - The request.
     * @return \WP_REST_Response
     */
    public static function store($request)
    {
        $siteImages = SiteImages::normalize($request->get_param('siteImages'));

        \update_option('extendify_site_images', Sanitizer::sanitizeArray($siteImages));
        return new \WP_REST_Response(['siteImages' => $siteImages]);
    }

    /**
     * Delete the cached site images option.
     *
     * @return \WP_REST_Response
     */
    public static function clear()
    {
        \delete_option('extendify_site_images');
        return new \WP_REST_Response(['siteImages' => []]);
    }

    /**
     * Fetch fresh images from the images service using the stored site profile,
     * persist them, and return them. Returns empty sets when the profile is
     * empty or the upstream call fails.
     *
     * @return array
     */
    private static function refresh()
    {
        $siteProfile = \get_option('extendify_site_profile', []);
        if (empty($siteProfile)) {
            return SiteImages::normalize([]);
        }

        $response = HttpClient::post(
            Constants::IMAGES_HOST . '/api/images',
            [
                'params' => [
                    'siteProfile' => $siteProfile,
                    'lang' => \get_locale(),
                    'imageTypes' => [
                        ['type' => 'hero'],
                        ['type' => 'general'],
                    ],
                    'source' => 'shared',
                ],
            ],
            null,
            true
        );

        $siteImages = SiteImages::normalize($response['response']['images'] ?? []);
        if (empty($siteImages['hero']) && empty($siteImages['general'])) {
            return $siteImages;
        }

        \update_option('extendify_site_images', Sanitizer::sanitizeArray($siteImages));
        return $siteImages;
    }
}
