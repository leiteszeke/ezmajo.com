<?php

/**
 * Help Center Script loader.
 */

namespace Extendify\HelpCenter;

defined('ABSPATH') || die('No direct access.');

use Extendify\Config;
use Extendify\HelpCenter\Controllers\RouterController;
use Extendify\HelpCenter\Controllers\SupportArticlesController;
use Extendify\HelpCenter\Controllers\TourController;
use Extendify\PartnerData;

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
        \add_action('admin_enqueue_scripts', [$this, 'loadGlobalScripts']);
    }

    /**
     * Adds scripts to every page.
     *
     * @return void
     */
    public function loadGlobalScripts()
    {
        $version = Config::$environment === 'PRODUCTION' ? Config::$version : uniqid();
        $scriptAssetPath = EXTENDIFY_PATH . 'public/build/' . Config::$assetManifest['extendify-help-center.php'];
        $fallback = [
            'dependencies' => [],
            'version' => $version,
        ];
        $scriptAsset = file_exists($scriptAssetPath) ? require $scriptAssetPath : $fallback;

        foreach ($scriptAsset['dependencies'] as $style) {
            \wp_enqueue_style($style);
        }

        \wp_enqueue_script(
            Config::$slug . '-help-center-scripts',
            EXTENDIFY_BASE_URL . 'public/build/' . Config::$assetManifest['extendify-help-center.js'],
            array_merge([Config::$slug . '-shared-scripts'], $scriptAsset['dependencies']),
            $scriptAsset['version'],
            true
        );

        $partnerData = PartnerData::getPartnerData();

        \wp_add_inline_script(
            Config::$slug . '-help-center-scripts',
            'window.extHelpCenterData = ' . \wp_json_encode([
                'userData' => [
                    'tourData' => \wp_json_encode(TourController::get()->get_data()),
                    'supportArticlesData' => \wp_json_encode(SupportArticlesController::get()->get_data()),
                    'routerData' => \wp_json_encode(RouterController::get()->get_data()),
                ],
            ]),
            'before'
        );

        \wp_set_script_translations(
            Config::$slug . '-help-center-scripts',
            'extendify-local',
            EXTENDIFY_PATH . 'languages/js'
        );

        \wp_enqueue_style(
            Config::$slug . '-help-center-styles',
            EXTENDIFY_BASE_URL . 'public/build/' . Config::$assetManifest['extendify-help-center.css'],
            [],
            Config::$version,
            'all'
        );
    }
}
