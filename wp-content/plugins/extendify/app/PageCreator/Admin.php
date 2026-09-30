<?php

/**
 * Admin.
 */

namespace Extendify\PageCreator;

defined('ABSPATH') || die('No direct access.');

use Extendify\Config;

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
        \add_action('rest_api_init', [$this, 'registerUserMeta']);
        \add_action('admin_enqueue_scripts', [$this, 'loadScripts']);
        // Disable the woocommerce setup wizard if installed via the page creator.
        \add_filter('woocommerce_enable_setup_wizard', '__return_false');
    }

    /**
     * Adds scripts to the admin
     *
     * @param string $hook - An optional hook provided by WP to identify the page.
     * @return void
     */
    public function loadScripts($hook)
    {
        if (!$this->isGutenbergEditor($hook)) {
            return;
        }

        $this->addScopedScriptsAndStyles();
    }

    /**
     * Makes sure we are on the correct page
     *
     * @param string $hook - An optional hook provided by WP to identify the page.
     * @return boolean
     */
    public function isGutenbergEditor($hook = '')
    {
        // Check for the post type, or on the FSE page.
        $type = isset($GLOBALS['typenow']) ? $GLOBALS['typenow'] : '';
        // phpcs:ignore WordPress.Security.NonceVerification.Recommended
        if (!$type && isset($_GET['postType'])) {
            // phpcs:ignore WordPress.Security.NonceVerification.Recommended
            $type = sanitize_text_field(wp_unslash($_GET['postType']));
        }

        if (\use_block_editor_for_post_type($type)) {
            return $hook && in_array($hook, ['post.php', 'post-new.php'], true);
        }

        // Temporarily disable the library on the site editor page until the issues with 6.3 are fixed.
        return false;
    }

    /**
     * Adds various scripts and styles
     *
     * @return void
     */
    public function addScopedScriptsAndStyles()
    {
        $userInfo = \get_user_option('extendify_page_creator_user');
        $userInfo = $userInfo ? json_decode($userInfo, true) : [
            'state' => ['openOnNewPage' => Config::$partnerId],
            'version' => 0,
        ];

        $version = constant('EXTENDIFY_DEVMODE') ? uniqid() : Config::$version;
        $scriptAssetPath = EXTENDIFY_PATH . 'public/build/' . Config::$assetManifest['extendify-page-creator.php'];
        $fallback = [
            'dependencies' => [],
            'version' => $version,
        ];
        $scriptAsset = file_exists($scriptAssetPath) ? require $scriptAssetPath : $fallback;
        foreach ($scriptAsset['dependencies'] as $style) {
            \wp_enqueue_style($style);
        }

        \wp_enqueue_script(
            Config::$slug . 'page-creator-scripts',
            EXTENDIFY_BASE_URL . 'public/build/' . Config::$assetManifest['extendify-page-creator.js'],
            array_merge([Config::$slug . '-shared-scripts'], $scriptAsset['dependencies']),
            $scriptAsset['version'],
            true
        );
        \wp_add_inline_script(
            Config::$slug . 'page-creator-scripts',
            'window.extPageCreator = ' . \wp_json_encode([
                'userInfo' => \wp_json_encode($userInfo),
                'pageTitlePattern' => \esc_html(\get_option('extendify_launch_page_title_pattern', '')),
            ]),
            'before'
        );
        \wp_set_script_translations(
            Config::$slug . 'page-creator-scripts',
            'extendify-local',
            EXTENDIFY_PATH . 'languages/js'
        );

        // Inline the library styles to keep them out of the iframe live preview.
        // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents
        $css = file_get_contents(
            EXTENDIFY_PATH . 'public/build/' . Config::$assetManifest['extendify-page-creator.css']
        );
        \wp_register_style(Config::$slug, false, [], Config::$version);
        \wp_enqueue_style(Config::$slug);
        \wp_add_inline_style(Config::$slug, $css);
    }


    /**
     * Adds user meta to the user profile
     *
     * @return void
     */
    public function registerUserMeta()
    {
        register_rest_field(
            'user',
            'extendify_page_creator_user',
            [
                'get_callback' => function ($user) {
                    return \get_user_option('extendify_page_creator_user', $user['id']);
                },
                'update_callback' => function ($value, $user) {
                    return \update_user_option($user->ID, 'extendify_page_creator_user', $value);
                },
                'schema' => [
                    'description' => __('Extendify Page Creator User Settings', 'extendify-local'),
                    'type' => 'string',
                ],
            ]
        );
    }
}
