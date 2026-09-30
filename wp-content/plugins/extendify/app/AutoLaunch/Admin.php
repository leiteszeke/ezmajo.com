<?php

/**
 * Admin.
 */

namespace Extendify\AutoLaunch;

defined('ABSPATH') || die('No direct access.');

use Extendify\Config;
use Extendify\Insights;
use Extendify\PartnerData;
use Extendify\Shared\Services\LaunchUpdate\LaunchUpdater;

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
            EXTENDIFY_BASE_URL . 'public/build/' . Config::$assetManifest['extendify-auto-launch.js'],
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

        $showLaunchUpdate = PartnerData::setting('showLaunchUpdate');
        $launchUpdate = $showLaunchUpdate ? LaunchUpdater::claimPendingUpdates() : [];
        \wp_add_inline_script(
            Config::$slug . '-launch-scripts',
            'window.extLaunchData = ' . \wp_json_encode([
                'editorStyles' => \get_block_editor_settings([], new \WP_Block_Editor_Context()),
                'wpRoot' => \rest_url(),
                'activeTests' => \get_option(Insights::ACTIVE_TESTS_OPTION, []),
                'showLaunchTitle' => (bool) PartnerData::setting('showLaunchTitle'),
                'customDesign' => PartnerData::setting('customDesign'),
                'partnerStrings' => PartnerData::setting('strings'),
                'resetSiteInformation' => [
                    'pagesIds' => array_map('esc_attr', $this->getLaunchCreatedPages()),
                    'navigationsIds' => array_map('esc_attr', $this->getLaunchCreatedNavigations()),
                    'templatePartsIds' => array_map('esc_attr', $this->getTemplatePartIds()),
                    'pageWithTitleTemplateId' => esc_attr($this->getPageWithTitleTemplateId()),
                ],
                'urlParams' => (object) $this->getURLParams(),
                'helloWorldPostSlug' =>
                    // phpcs:ignore WordPress.WP.I18n.MissingArgDomain
                    \_x(
                        'hello-world',
                        'Default post slug'
                    ),
                'hideAutoLaunchExitLink' => (bool) PartnerData::setting('hideLaunchExitLink'),
                'themeUpdateNeeded' => !empty($launchUpdate['theme']),
                'pluginUpdateNeeded' => !empty($launchUpdate['plugin']),
                'launchUpdateAttempt' => $launchUpdate['attempt'] ?? 0,
                'launchUpdateStale' => (object) ($launchUpdate['stale'] ?? []),
                'pluginUpdateViaRest' => LaunchUpdater::isWpOrgBuild(),
                'pluginSlug' => Config::$slug,
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
            EXTENDIFY_BASE_URL . 'public/build/' . Config::$assetManifest['extendify-auto-launch.css'],
            [Config::$slug . '-shared-common-styles'],
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

    /**
     * Parses and sanitizes URL parameters against an allowlist.
     *
     * @return array
     */
    private function getURLParams()
    {
        $allowed = [
            'type' => 'string',
            'title' => 'string',
            'description' => 'string',
            'objective' => 'string',
            'category' => 'string',
            'structure' => 'string',
            'tone' => 'string[]',
            'products' => 'string|boolean',
            'appointments' => 'boolean',
            'events' => 'boolean',
            'donations' => 'boolean',
            'multilingual' => 'boolean',
            'contact' => 'boolean',
            'address' => 'string|boolean',
            'blog' => 'boolean',
            'landing-page' => 'string',
            'cta-link' => 'string|boolean',
            'build-id' => 'string',
            'go' => 'boolean',
        ];

        $params = [];
        foreach ($allowed as $param => $type) {
            // phpcs:ignore WordPress.Security.NonceVerification.Recommended
            if (!isset($_GET[$param])) {
                continue;
            }

            // phpcs:ignore WordPress.Security.NonceVerification.Recommended
            $raw = sanitize_text_field(wp_unslash($_GET[$param]));
            if ($raw === '') {
                continue;
            }

            if ($type === 'string[]') {
                $parts = is_array($raw) ? $raw : explode(',', (string) $raw);

                $items = array_values(array_filter(
                    array_map(
                        static function ($v) {
                            return sanitize_text_field((string) $v);
                        },
                        $parts
                    ),
                    static function ($v) {
                        return $v !== '';
                    }
                ));

                if (empty($items)) {
                    continue;
                }

                $params[$param] = $items;
                continue;
            }

            if (strtolower($raw) === 'none') {
                $params[$param] = false;
                continue;
            }

            $asBool = filter_var($raw, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);

            if ($type === 'boolean') {
                if ($asBool === null) {
                    continue;
                }
                $params[$param] = $asBool;
                continue;
            }

            if ($type === 'string|boolean' && $asBool !== null) {
                $params[$param] = $asBool;
                continue;
            }

            $params[$param] = $raw;
        }

        return $params;
    }
}
