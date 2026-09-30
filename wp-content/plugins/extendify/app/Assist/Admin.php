<?php

/**
 * Admin.
 */

namespace Extendify\Assist;

defined('ABSPATH') || die('No direct access.');

use Extendify\Assist\Controllers\GlobalsController;
use Extendify\Assist\Controllers\RouterController;
use Extendify\Assist\Controllers\TasksController;
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
     * @return self|void
     */
    public function __construct()
    {
        \add_action('admin_enqueue_scripts', [$this, 'loadPageScripts']);
    }

    /**
     * Adds scripts to the main admin page
     *
     * @return void
     */
    public function loadPageScripts()
    {
        $version = constant('EXTENDIFY_DEVMODE') ? uniqid() : Config::$version;
        $scriptAssetPath = EXTENDIFY_PATH . 'public/build/' . Config::$assetManifest['extendify-assist-page.php'];
        $fallback = [
            'dependencies' => [],
            'version' => $version,
        ];
        $scriptAsset = file_exists($scriptAssetPath) ? require $scriptAssetPath : $fallback;

        foreach ($scriptAsset['dependencies'] as $style) {
            \wp_enqueue_style($style);
        }

        \wp_enqueue_script(
            Config::$slug . '-assist-page-scripts',
            EXTENDIFY_BASE_URL . 'public/build/' . Config::$assetManifest['extendify-assist-page.js'],
            array_merge([Config::$slug . '-shared-scripts'], $scriptAsset['dependencies']),
            $scriptAsset['version'],
            true
        );

        \wp_add_inline_script(
            Config::$slug . '-assist-page-scripts',
            'window.extAssistData = ' . \wp_json_encode([
                'launchCompleted' => (bool) Config::$launchCompleted,
                'hasCustomizer' => (bool) \has_action('customize_register'),
                'domainsSuggestionSettings' => [
                    'showBanner' => (bool) PartnerData::setting('showDomainBanner'),
                    'showTask' => (bool) PartnerData::setting('showDomainTask'),
                    'showSecondaryBanner' => (bool) PartnerData::setting('showSecondaryDomainBanner'),
                    'showSecondaryTask' => (bool) PartnerData::setting('showSecondaryDomainTask'),
                    'stagingSites' => array_map('esc_attr', PartnerData::setting('stagingSites')),
                    'searchUrl' => \esc_attr(PartnerData::setting('domainSearchURL')),
                ],
                'userData' => [
                    'taskData' => \wp_json_encode(TasksController::get()->get_data()),
                    'globalData' => \wp_json_encode(GlobalsController::get()->get_data()),
                    'routerData' => \wp_json_encode(RouterController::get()->get_data()),
                    'recommendationData' => \wp_json_encode(RouterController::get()->get_data()),
                    'tasksDependencies' => \wp_json_encode($this->getTasksDependencies()),
                    'domainsRecommendationsActivities' => \wp_json_encode(
                        get_option('extendify_domains_recommendations_activities', null)
                    ),
                ],
                'canSeeRestartLaunch' => (bool) $this->canRunLaunchAgain(),
                'editSiteNavigationMenuLink' => \current_theme_supports('menus')
                    ? \esc_url(\admin_url('nav-menus.php'))
                    : \esc_url(\admin_url('site-editor.php?path=%2Fnavigation')),
            ]),
            'before'
        );

        \wp_set_script_translations(
            Config::$slug . '-assist-page-scripts',
            'extendify-local',
            EXTENDIFY_PATH . 'languages/js'
        );

        \wp_enqueue_style(
            Config::$slug . '-assist-page-styles',
            EXTENDIFY_BASE_URL . 'public/build/' . Config::$assetManifest['extendify-assist-page.css'],
            [],
            Config::$version,
            'all'
        );
    }

    /**
     * Check to see if the user can re-run Launch
     *
     * @return boolean
     */
    public function canRunLaunchAgain()
    {
        $launchCompleted = \get_option('extendify_onboarding_completed', false);
        return (!$launchCompleted || $launchCompleted === 'false') ? false : true;
    }

    /**
     * Check to see if specific tasks are completed or not.
     *
     * @return array
     */
    public function getTasksDependencies()
    {
        $give = \get_option('give_onboarding', false);
        $completedSetupGivewp = isset($give['form_id']) && $give['form_id'] > 0;

        $woo = \get_option('woocommerce_onboarding_profile', false);
        $completedWoocommerceStore = (
            isset($woo['completed']) && $woo['completed']
        ) || (
            isset($woo['skipped']) && $woo['skipped']
        );

        $aioseo = \get_option('aioseo_blc_options_internal', false);
        $completedSetupAIOSeo = false;
        if ($aioseo) {
            $aioseo = \json_decode($aioseo, true);
            $completedSetupAIOSeo = isset($aioseo['internal'])
                && array_key_exists('firstActivated', $aioseo['internal']);
        }

        $completedWPFormsLite = (bool) \get_option('wpforms_forms_first_created', false)
            || (bool) (\wp_count_posts('wpforms')->publish ?? 0);

        // The two extra keys that will be added after connecting the store
        // are the `admin_menu` and `hide_out_of_stock`.
        $yourWebShop = \get_option('ecwid_plugin_data', false);
        $completedYourWebShop = isset($yourWebShop['admin_menu']) && $yourWebShop['admin_menu'];

        $monsterInsightsSiteProfile = \get_option('monsterinsights_site_profile', false);
        $completedMonsterInsights = isset($monsterInsightsSiteProfile['token']) && $monsterInsightsSiteProfile['token'];

        return compact(
            'completedSetupGivewp',
            'completedWoocommerceStore',
            'completedSetupAIOSeo',
            'completedWPFormsLite',
            'completedYourWebShop',
            'completedMonsterInsights'
        );
    }
}
