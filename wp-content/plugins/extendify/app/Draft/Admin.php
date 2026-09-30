<?php

/**
 * Admin.
 */

namespace Extendify\Draft;

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
     * @return self|void
     */
    public function __construct()
    {
        \add_action('admin_init', [$this, 'loadScripts']);
    }

    /**
     * Adds scripts to the admin
     *
     * @return void
     */
    public function loadScripts()
    {
        add_action('enqueue_block_editor_assets', [$this, 'enqueueGutenbergAssets']);
    }

    /**
     * Enqueues Gutenberg stuff on a non-Gutenberg page.
     *
     * @return void
     */
    public function enqueueGutenbergAssets()
    {
        $currentScreen = get_current_screen();
        // Only load in the post editor.
        if ($currentScreen->base !== 'post') {
            return;
        }

        $version = constant('EXTENDIFY_DEVMODE') ? uniqid() : Config::$version;
        $scriptAssetPath = EXTENDIFY_PATH . 'public/build/' . Config::$assetManifest['extendify-draft.php'];
        $fallback = [
            'dependencies' => [],
            'version' => $version,
        ];

        $scriptAsset = file_exists($scriptAssetPath) ? require $scriptAssetPath : $fallback;
        foreach ($scriptAsset['dependencies'] as $style) {
            wp_enqueue_style($style);
        }

        \wp_enqueue_script(
            Config::$slug . '-draft-scripts',
            EXTENDIFY_BASE_URL . 'public/build/' . Config::$assetManifest['extendify-draft.js'],
            array_merge([Config::$slug . '-shared-scripts'], $scriptAsset['dependencies']),
            $scriptAsset['version'],
            true
        );

        \wp_set_script_translations(
            Config::$slug . '-draft-scripts',
            'extendify-local',
            EXTENDIFY_PATH . 'languages/js'
        );

        $version = constant('EXTENDIFY_DEVMODE') ? uniqid() : Config::$version;
        if (isset(Config::$assetManifest['extendify-draft.css'])) {
            \wp_enqueue_style(
                Config::$slug . '-draft-styles',
                EXTENDIFY_BASE_URL . 'public/build/' . Config::$assetManifest['extendify-draft.css'],
                [],
                $version,
                'all'
            );
        }
    }
}
