<?php

/**
 * Controls Support Articles
 */

namespace Extendify\HelpCenter\Controllers;

defined('ABSPATH') || die('No direct access.');

use Extendify\Constants;
use Extendify\Shared\Services\Sanitizer;

/**
 * The controller for fetching support articles
 */

class SupportArticlesController
{
    /**
     * Return support articles from source.
     *
     * @return \WP_REST_Response
     */
    public static function fetchArticles()
    {
        if (!defined('EXTENDIFY_PARTNER_ID')) {
            return new \WP_REST_Response([], 200);
        }

        $response = wp_remote_get(sprintf('%s/api/posts?lang=%s', Constants::KB_HOST, \get_locale()));

        if (is_wp_error($response)) {
            return new \WP_REST_Response([]);
        }

        $body = json_decode(\wp_remote_retrieve_body($response), true);
        return new \WP_REST_Response($body);
    }

    /**
     * Return the selected support article from source.
     *
     * @param \WP_REST_Request $request - The request.
     * @return \WP_REST_Response
     */
    public static function article($request)
    {
        $response = wp_remote_get(
            sprintf(
                '%s/api/posts/%s?lang=%s',
                Constants::KB_HOST,
                $request->get_param('slug'),
                \get_locale()
            )
        );

        if (is_wp_error($response)) {
            return new \WP_REST_Response([]);
        }

        return new \WP_REST_Response(wp_remote_retrieve_body($response));
    }

    /**
     * Return the data
     *
     * @return \WP_REST_Response
     */
    public static function get()
    {
        $data = get_option('extendify_assist_support_articles', []);
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
        update_option('extendify_assist_support_articles', [
            'state' => Sanitizer::sanitizeArray($data),
        ]);
        return new \WP_REST_Response($data);
    }

    /**
     * Attempts to find a redirect URL from the old docs site
     *
     * @param \WP_REST_Request $request - The request.
     * @return \WP_REST_Response
     */
    public static function getRedirect($request)
    {
        $url = 'https://wordpress.org' . $request->get_param('path');
        $response = \wp_remote_head($url);
        $location = \wp_remote_retrieve_header($response, 'location');
        if (\is_wp_error($response)) {
            \wp_send_json_error(\__('Page not found', 'extendify-local'), 404);
        }

        // No redirect, we're done.
        if (empty($location)) {
            return new \WP_REST_Response($url, 200);
        }

        // Keep going until no more redirects.
        $request->set_param('path', \wp_parse_url($location, PHP_URL_PATH));
        return self::getRedirect($request);
    }
}
