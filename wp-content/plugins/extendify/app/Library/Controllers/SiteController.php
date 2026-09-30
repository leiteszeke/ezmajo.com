<?php

/**
 * Controls Site options
 */

namespace Extendify\Library\Controllers;

defined('ABSPATH') || die('No direct access.');

use Extendify\Shared\Services\Sanitizer;

/**
 * The controller for persisting site data
 */

class SiteController
{
    /**
     * Return the data
     *
     * @return \WP_REST_Response
     */
    public static function get()
    {
        $data = \get_option('extendify_library_site_data', []);
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
        $data = json_decode($request->get_param('state'), true);
        \update_option('extendify_library_site_data', Sanitizer::sanitizeArray($data));
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

    /**
     * Update the user's global styles with the extendify utilities
     *
     * @return \WP_REST_Response
     */
    public static function addUtilsToGlobalStyles()
    {
        $globalStyles = get_posts([
            'post_type' => 'wp_global_styles',
            'post_status' => 'publish',
            'posts_per_page' => -1,
        ]);

        $extendifyCss = static::getDeactivationCss();

        foreach ($globalStyles as $post) {
            if (!isset($post->post_content)) {
                continue;
            }

            $content = json_decode($post->post_content, true);
            if (!isset($content['styles']['css'])) {
                if (!isset($content['styles'])) {
                    $content['styles'] = [];
                }

                $content['styles']['css'] = '';
                $content['isGlobalStylesUserThemeJSON'] = true;
                $content['version'] = 2;
            }

            // If they already have extendify styles, leave it alone.
            if (str_contains($content['styles']['css'], 'ext-')) {
                continue;
            }

            $content['styles']['css'] .= ("\n\n" . $extendifyCss);

            wp_update_post(wp_slash([
                'ID' => $post->ID,
                'post_content' => wp_json_encode($content),
            ]));
        }//end foreach

        return new \WP_REST_Response(['success' => true], 200);
    }

    /**
     * Custom CSS to be added on deactivation
     *
     * @return string
     */
    public static function getDeactivationCss()
    {
        $css = '';
        $theme = get_option('template');

        if ($theme === 'twentytwenty') {
            $css = '/* Twenty Twenty adds a lot of margin automatically to blocks.
            We only want our own margin added to our patterns. */

            .ext .wp-block-group__inner-container figure.wp-block-gallery.alignfull {
                margin-top: unset !important;
                margin-bottom: unset !important;
            }';
        }

        // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents
        $content = file_get_contents(EXTENDIFY_PATH . 'public/build/utility-minimum.css');

        return $css .= "\n\n" . $content;
    }
}
