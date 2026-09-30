<?php

/**
 * Controls Site Profile options
 */

namespace Extendify\Shared\Controllers;

defined('ABSPATH') || die('No direct access.');

use Extendify\Shared\Services\Sanitizer;

/**
 * The controller for persisting site data
 */

class SiteProfileController
{
    /**
     * Persist single data
     *
     * @param \WP_REST_Request $request - The request.
     * @return \WP_REST_Response
     */
    public static function store($request)
    {
        $value = $request->get_param('siteProfile');
        // sanitize_text_field() on the raw JSON entity-encodes from the first "<"
        // to the end, corrupting it. Decode first so we sanitize fields, not JSON.
        $siteProfile = is_string($value) ? json_decode($value, true) : $value;
        \update_option('extendify_site_profile', Sanitizer::sanitizeUnknown($siteProfile));
        return new \WP_REST_Response($siteProfile);
    }

    /**
     * Get option data by name.
     *
     * @return \WP_REST_Response
     */
    public static function get()
    {
        $siteProfile = \get_option('extendify_site_profile', []);
        return new \WP_REST_Response($siteProfile);
    }
}
