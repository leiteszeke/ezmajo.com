<?php

/**
 * Controls Site options
 */

namespace Extendify\PageCreator\Controllers;

defined('ABSPATH') || die('No direct access.');

use Extendify\Shared\Services\Sanitizer;

/**
 * The controller for persisting site data
 */

class SiteController
{
    /**
     * Get option data by name.
     *
     * @param \WP_REST_Request $request - The request.
     * @return \WP_REST_Response - Sends JSON response with the option data.
     */
    public static function get($request)
    {
        $data = \get_option('extendify_' . $request->get_param('name'));
        if (empty($data)) {
            return new \WP_REST_Response([]);
        }

        if ($request->get_param('item')) {
            $data = ($data['state'][$request->get_param('item')] ?? []);
        }

        return new \WP_REST_Response($data);
    }
    /**
     * Persist single data
     *
     * @param \WP_REST_Request $request - The request.
     * @return \WP_REST_Response
     */
    public static function single($request)
    {
        $key = $request->get_param('key');
        $value = $request->get_param('value');
        // Remove the 'extendify_' prefix if it exists.
        if (strpos($key, 'extendify_') === 0) {
            $key = substr($key, 10);
        }

        \update_option('extendify_' . $key, Sanitizer::sanitizeUnknown($value));
        return new \WP_REST_Response($value);
    }
}
