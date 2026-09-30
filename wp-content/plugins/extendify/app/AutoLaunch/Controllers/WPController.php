<?php

/**
 * WP Controller
 */

namespace Extendify\AutoLaunch\Controllers;

defined('ABSPATH') || die('No direct access.');

use Extendify\Agent\Controllers\ChatHistoryController;
use Extendify\PartnerData;
use Extendify\Shared\DataProvider\ResourceData;
use Extendify\Shared\Services\AutoUpdate\AutoUpdate;
use Extendify\Shared\Services\LaunchUpdate\LaunchUpdater;
use Extendify\Shared\Services\Sanitizer;
use Extendify\SiteVisibility;

/**
 * The controller for interacting with WordPress.
 */

class WPController
{
    /**
     * Persist the data
     *
     * @param \WP_REST_Request $request - The request.
     * @return \WP_REST_Response
     */
    public static function updateOption($request)
    {
        // TODO: Move unprefixed updates to the server, or create an allowlist.
        $params = $request->get_json_params();
        \update_option($params['option'], Sanitizer::sanitizeUnknown($params['value']));

        return new \WP_REST_Response('ok');
    }
    /**
     * Save a block to the database
     *
     * @param \WP_REST_Request $request - The request.
     * @return \WP_REST_Response
     */
    public static function savePattern($request)
    {
        $params = $request->get_json_params();
        $key = $params['option'];
        // Remove the 'extendify_' prefix if it exists.
        if (strpos($key, 'extendify_') === 0) {
            $key = substr($key, 10);
        }

        \update_option('extendify_' . $key, Sanitizer::sanitizeBlocks($params['value']));

        return new \WP_REST_Response('ok');
    }

    /**
     * Get a setting from the options table
     *
     * @param \WP_REST_Request $request - The request.
     * @return \WP_REST_Response
     */
    public static function getOption($request)
    {
        $value = \get_option($request->get_param('option'), null);
        return new \WP_REST_Response($value);
    }

    /**
     * Get the list of active plugins slugs
     *
     * @return \WP_REST_Response
     */
    public static function getActivePlugins()
    {
        return new \WP_REST_Response(array_values(\get_option('active_plugins', [])));
    }

    /**
     * This function will force the regenerating of the cache.
     *
     * @return \WP_REST_Response
     */
    public static function prefetchAssistData()
    {
        if (class_exists(ResourceData::class)) {
            (new ResourceData())->getData();
        }

        return new \WP_REST_Response('ok', 200);
    }

    /**
     * Create a post of type wp_navigation with meta.
     *
     * @param \WP_REST_Request $request - The request.
     * @return \WP_REST_Response
     */
    public static function createNavigationWithMeta($request)
    {
        $post = \wp_insert_post([
            'post_type' => 'wp_navigation',
            'post_title' => $request->get_param('title'),
            'post_name' => $request->get_param('slug'),
            'post_status' => 'publish',
            'post_content' => $request->get_param('content'),
        ]);

        \add_post_meta($post, 'made_with_extendify_launch', 1);

        return new \WP_REST_Response([
            'id' => $post,
        ]);
    }

    /**
     * Returns a nav menu matching the given slug.
     *
     * @return \WP_REST_Response
     */
    public static function getNavigation($request)
    {
        $slug = $request->get_param('slug');
        $args = [
            'post_type' => 'wp_navigation',
            'name' => $slug,
            'post_status' => 'publish',
            'numberposts' => 1,
        ];

        $posts = \get_posts($args);

        if (empty($posts)) {
            return new \WP_REST_Response([
                'message' => 'Navigation not found',
            ], 404);
        }

        $post = $posts[0];

        return new \WP_REST_Response([
            'id' => $post->ID,
            'title' => $post->post_title,
            'slug' => $post->post_name,
            'content' => $post->post_content,
        ]);
    }

    /**
     * This function will be called post finishing the Launch..
     *
     * @return \WP_REST_Response
     */
    public static function postLaunch()
    {
        // Set the state to import images.
        \update_option('extendify_check_for_image_imports', true, false);
        \delete_transient('extendify_import_images_check_delay');

        \update_option('extendify_onboarding_completed', gmdate('Y-m-d\TH:i:s\Z'));
        // Anything already in the chat reads as an onboarding offer the user answered.
        ChatHistoryController::clear();
        LaunchUpdater::clearAttempts();

        if (PartnerData::setting('useComingSoon')) {
            SiteVisibility::markUnpublished();
        }

        \do_action('extendify_after_launch');

        return new \WP_REST_Response('ok');
    }

    /**
     * Apply pending theme / PUC-plugin upgrades before Launch runs (see
     * LaunchUpdater::run, which never throws).
     *
     * @return \WP_REST_Response
     */
    public static function runUpdates()
    {
        return new \WP_REST_Response(LaunchUpdater::run());
    }

    /**
     * Runs on every launch page load, so it must not discard site state.
     *
     * @return \WP_REST_Response
     */
    public static function preLaunch()
    {
        if (AutoUpdate::isEnabled()) {
            AutoUpdate::enableAutoUpdateForPlugin(EXTENDIFY_PLUGIN_BASENAME);
            AutoUpdate::addToAutoUpdateList('auto_update_themes', 'extendable');
            AutoUpdate::enableAutoUpdateForCore();
        }

        return new \WP_REST_Response(['success' => true]);
    }

    /**
     * Discards the launched state after the user confirms the restart.
     *
     * @return \WP_REST_Response
     */
    public static function resetLaunchState()
    {
        \delete_option('extendify_onboarding_completed');
        ChatHistoryController::clear();

        return new \WP_REST_Response(['success' => true]);
    }
}
