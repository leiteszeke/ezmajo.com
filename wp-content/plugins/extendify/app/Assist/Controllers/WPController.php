<?php

/**
 * WP Controller
 */

namespace Extendify\Assist\Controllers;

defined('ABSPATH') || die('No direct access.');

/**
 * The controller for interacting with WordPress.
 */

class WPController
{
    /**
     * Get the list of active plugins slugs
     *
     * @return \WP_REST_Response
     */
    public static function getActivePlugins()
    {
        $value = \get_option('active_plugins', null);
        $slugs = [];
        foreach ($value as $plugin) {
            $slugs[] = explode('/', $plugin)[0];
        }

        return new \WP_REST_Response([
            'success' => true,
            'data' => $slugs,
        ]);
    }
}
