<?php

/**
 * Admin.
 */

namespace Extendify\Recommendations;

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
        \add_action('admin_enqueue_scripts', [$this, 'loadScriptsAndStyles']);
    }

    /**
     * Adds various JS scripts if on the plugin install page
     *
     * @return void
     */
    public function loadScriptsAndStyles()
    {
        if (\get_current_screen()->id !== 'plugin-install') {
            return;
        }

        $version = constant('EXTENDIFY_DEVMODE') ? uniqid() : Config::$version;
        $scriptAssetPath = EXTENDIFY_PATH . 'public/build/' . Config::$assetManifest['extendify-recommendations.php'];
        $fallback = [
            'dependencies' => [],
            'version' => $version,
        ];
        $scriptAsset = file_exists($scriptAssetPath) ? require $scriptAssetPath : $fallback;

        foreach ($scriptAsset['dependencies'] as $style) {
            \wp_enqueue_style($style);
        }

        \wp_enqueue_script(
            Config::$slug . '-recommendations-scripts',
            EXTENDIFY_BASE_URL . 'public/build/' . Config::$assetManifest['extendify-recommendations.js'],
            array_merge([Config::$slug . '-shared-scripts'], $scriptAsset['dependencies']),
            $scriptAsset['version'],
            true
        );

        \wp_enqueue_style(
            Config::$slug . '-recommendations-styles',
            EXTENDIFY_BASE_URL . 'public/build/' . Config::$assetManifest['extendify-recommendations.css'],
            [],
            Config::$version,
            'all'
        );

        \wp_add_inline_script(
            Config::$slug . '-recommendations-scripts',
            'window.extRecommendationsData = ' . \wp_json_encode(
                [
                    'showPartnerBranding' => (bool) \esc_attr(
                        PartnerData::setting('productRecommendations')['showPartnerBranding']
                    ),
                ]
            ),
            'before'
        );
        \wp_set_script_translations(
            Config::$slug . '-recommendations-scripts',
            'extendify-local',
            EXTENDIFY_PATH . 'languages/js'
        );
    }
}
