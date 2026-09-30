<?php

/**
 * WooCommerce  Controller
 */

namespace Extendify\Launch\Controllers;

defined('ABSPATH') || die('No direct access.');

use Extendify\Launch\Services\WooCommerceImporter;

/**
 * The controller for interacting with WooCommerce to import temporary data.
 */

class WooCommerceController
{
    /**
     * Import the temporary products.
     *
     * @return \WP_REST_Response
     */
    public static function importTemporaryProducts()
    {
        if (count(get_posts(['post_type' => 'product']))) {
            return new \WP_REST_Response(['success' => true]);
        }

        $results = WooCommerceImporter::import();

        if (is_wp_error($results)) {
            return new \WP_REST_Response([
                'success' => false,
                'message' => $results->get_error_message(),
            ]);
        }

        update_option('extendify_wc_import_results', $results);

        return new \WP_REST_Response(['success' => true]);
    }
}
