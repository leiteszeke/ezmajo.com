<?php

/**
 * Admin.
 */

namespace Extendify\Launch;

defined('ABSPATH') || die('No direct access.');

use Extendify\Config;
use Extendify\PartnerData;

/**
 * This class handles any file loading for the admin area.
 */

class Admin
{
    /**
     * Adds various actions to set up the page
     *
     * @return void
     */
    public function __construct()
    {
        \add_action('admin_enqueue_scripts', [$this, 'addScopedScriptsAndStyles']);
    }

    /**
     * Adds various JS scripts
     *
     * @return void
     */
    public function addScopedScriptsAndStyles()
    {
        $version = constant('EXTENDIFY_DEVMODE') ? uniqid() : Config::$version;
        $scriptAssetPath = EXTENDIFY_PATH . 'public/build/' . Config::$assetManifest['extendify-launch.php'];
        $fallback = [
            'dependencies' => [],
            'version' => $version,
        ];
        $scriptAsset = file_exists($scriptAssetPath) ? require $scriptAssetPath : $fallback;
        foreach ($scriptAsset['dependencies'] as $style) {
            wp_enqueue_style($style);
        }

        \wp_enqueue_script(
            Config::$slug . '-launch-scripts',
            EXTENDIFY_BASE_URL . 'public/build/' . Config::$assetManifest['extendify-launch.js'],
            array_merge([Config::$slug . '-shared-scripts'], $scriptAsset['dependencies']),
            $scriptAsset['version'],
            true
        );

        if (constant('EXTENDIFY_DEVMODE')) {
            // In dev, reset the variaton to the default.
            wp_update_post([
                'ID' => \WP_Theme_JSON_Resolver::get_user_global_styles_post_id(),
                'post_content' => \wp_json_encode([
                    'styles' => [],
                    'settings' => [],
                    'isGlobalStylesUserThemeJSON' => true,
                    'version' => 2,
                ]),
            ]);
        }

        \wp_add_inline_script(
            Config::$slug . '-launch-scripts',
            'window.extOnbData = ' . \wp_json_encode([
                'editorStyles' => \wp_json_encode(\get_block_editor_settings([], new \WP_Block_Editor_Context())),
                'wpRoot' => \esc_url_raw(\rest_url()),
                'activeTests' => array_map('esc_attr', \get_option('extendify_active_tests', [])),
                'resetSiteInformation' => [
                    'pagesIds' => array_map('esc_attr', $this->getLaunchCreatedPages()),
                    'navigationsIds' => array_map('esc_attr', $this->getLaunchCreatedNavigations()),
                    'templatePartsIds' => array_map('esc_attr', $this->getTemplatePartIds()),
                    'pageWithTitleTemplateId' => esc_attr($this->getPageWithTitleTemplateId()),
                ],
                'helloWorldPostSlug' => \esc_attr(
                    // phpcs:ignore WordPress.WP.I18n.MissingArgDomain
                    \_x(
                        'hello-world',
                        'Default post slug'
                    )
                ),
                'redirectToWebsite' => (bool) PartnerData::setting('launchRedirectWebsite'),
            ]),
            'before'
        );

        \wp_set_script_translations(
            Config::$slug . '-launch-scripts',
            'extendify-local',
            EXTENDIFY_PATH . 'languages/js'
        );

        \wp_enqueue_style(
            Config::$slug . '-launch-styles',
            EXTENDIFY_BASE_URL . 'public/build/' . Config::$assetManifest['extendify-launch.css'],
            [],
            Config::$version
        );
    }

    /**
     * Returns all the pages created by Extendify.
     *
     * @return array
     */
    public static function getLaunchCreatedPages()
    {
        $posts = get_posts([
            'numberposts' => -1,
            'post_status' => 'publish',
            'post_type' => ['page', 'post'],
            // only return the ID field.
            'fields' => 'ids',
        ]);

        return array_values(array_filter(array_map(function ($post) {
            return get_post_meta($post, 'made_with_extendify_launch') ? $post : false;
        }, $posts)));
    }

    /**
     * Returns all the navigations created by Extendify.
     *
     * @return array
     */
    public static function getLaunchCreatedNavigations()
    {
        $posts = get_posts([
            'numberposts' => -1,
            'post_status' => 'publish',
            'post_type' => 'wp_navigation',
            // only return the ID field.
            'fields' => 'ids',
        ]);

        return array_values(array_filter(array_map(function ($post) {
            return get_post_meta($post, 'made_with_extendify_launch') ? $post : false;
        }, $posts)));
    }

    /**
     * Returns the idz of the header and footer template part created by extendify.
     *
     * @return array
     */
    public static function getTemplatePartIds()
    {
        return [
            (get_block_template(get_stylesheet() . '//header', 'wp_template_part')->id ?? ''),
            (get_block_template(get_stylesheet() . '//footer', 'wp_template_part')->id ?? ''),
        ];
    }


    /**
     * Returns the id of the page-with-title template for the current theme.
     *
     * @return string
     */
    public static function getPageWithTitleTemplateId()
    {
        $template = get_block_template(get_stylesheet() . '//page-with-title', 'wp_template');
        return $template && !empty($template->id) ? $template->id : '';
    }
}
