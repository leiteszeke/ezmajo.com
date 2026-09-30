<?php

/**
 * Assets.
 */

namespace Extendify\Notifications;

defined('ABSPATH') || die('No direct access.');

use Extendify\Config;

/**
 * The one bundle every slot renders from, admin or front end.
 */
class Assets
{
    /**
     * @return void
     */
    public static function enqueue()
    {
        $manifest = Config::$assetManifest;
        if (
            empty($manifest['extendify-notifications.php'])
            || empty($manifest['extendify-notifications.js'])
        ) {
            return;
        }

        $version = constant('EXTENDIFY_DEVMODE') ? uniqid() : Config::$version;
        $scriptAssetPath = EXTENDIFY_PATH . 'public/build/'
            . $manifest['extendify-notifications.php'];
        $fallback = [
            'dependencies' => [],
            'version' => $version,
        ];
        $scriptAsset = file_exists($scriptAssetPath) ? require $scriptAssetPath : $fallback;

        foreach ($scriptAsset['dependencies'] as $style) {
            \wp_enqueue_style($style);
        }

        \wp_enqueue_script(
            Config::$slug . '-notifications-scripts',
            EXTENDIFY_BASE_URL . 'public/build/' . $manifest['extendify-notifications.js'],
            array_merge([Config::$slug . '-shared-scripts'], $scriptAsset['dependencies']),
            $scriptAsset['version'],
            true
        );

        \wp_set_script_translations(
            Config::$slug . '-notifications-scripts',
            'extendify-local',
            EXTENDIFY_PATH . 'languages/js'
        );

        if (empty($manifest['extendify-notifications.css'])) {
            return;
        }

        \wp_enqueue_style(
            Config::$slug . '-notifications-styles',
            EXTENDIFY_BASE_URL . 'public/build/' . $manifest['extendify-notifications.css'],
            [],
            Config::$version,
            'all'
        );
    }
}
