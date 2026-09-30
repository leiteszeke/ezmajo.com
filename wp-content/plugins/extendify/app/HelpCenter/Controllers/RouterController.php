<?php

/**
 * Controls Router details
 */

namespace Extendify\HelpCenter\Controllers;

defined('ABSPATH') || die('No direct access.');

use Extendify\Shared\Services\Sanitizer;

/**
 * The controller for plugin dependency checking, etc
 */

class RouterController
{
    /**
     * Return the data
     *
     * @return \WP_REST_Response
     */
    public static function get()
    {
        $data = get_option('extendify_help_center_router', []);
        return new \WP_REST_Response($data);
    }

    /**
     * Persist the data
     *
     * @param \WP_REST_Request $request - The request.
     * @return \WP_REST_Response
     */
    public static function store($request)
    {
        $data = $request->get_param('state');
        update_option('extendify_help_center_router', [
            'state' => Sanitizer::sanitizeArray($data),
        ]);
        return new \WP_REST_Response($data);
    }
}
