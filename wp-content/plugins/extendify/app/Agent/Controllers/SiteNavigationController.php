<?php

/**
 * Site Navigation Controller
 */

namespace Extendify\Agent\Controllers;

/**
 * Site Navigation Controller
 */
class SiteNavigationController
{
    /**
     * Get a list of published navigation items from the site.
     *
     * @param \WP_REST_Request $request The REST API request
     * @return \WP_REST_Response.
     */
    public static function getSiteNavigation($request): \WP_REST_Response
    {
        $navigation = get_posts([
            'numberposts' => -1,
            'post_status' => 'publish',
            'post_type' => 'wp_navigation',
            'include' => $request->get_param('only') ? explode(',', $request->get_param('only')) : []
        ]);

        return new \WP_REST_Response(array_map(function ($item) {
            return [
                "id" => $item->ID,
                "name" => $item->post_title,
                "content" => $item->post_content
            ];
        }, $navigation), 200);
    }
}
