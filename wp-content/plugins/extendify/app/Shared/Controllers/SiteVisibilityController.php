<?php

/**
 * Controller for site visibility
 */

namespace Extendify\Shared\Controllers;

defined('ABSPATH') || die('No direct access.');

use Extendify\SiteVisibility;

/**
 * The controller for moving the site in and out of Coming Soon mode
 */

class SiteVisibilityController
{
    /**
     * Publish the site
     *
     * @return \WP_REST_Response
     */
    public static function publish()
    {
        SiteVisibility::markPublished();

        return new \WP_REST_Response(['success' => true]);
    }

    /**
     * Unpublish the site
     *
     * @return \WP_REST_Response
     */
    public static function unpublish()
    {
        SiteVisibility::markUnpublished();

        return new \WP_REST_Response(['success' => true]);
    }
}
