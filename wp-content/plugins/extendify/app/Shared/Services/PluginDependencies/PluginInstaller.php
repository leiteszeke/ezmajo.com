<?php

/**
 * Install plugins programmatically.
 */

namespace Extendify\Shared\Services\PluginDependencies;

defined('ABSPATH') || die('No direct access.');

use Extendify\Shared\Services\AutoUpdate\AutoUpdate;

/**
 * Install plugins programmatically.
 */

class PluginInstaller
{
    /**
     * Install or activate a required plugin
     *
     * @param string $slug         - The plugin slug.
     * @param string $fallbackPath - The fallback path.
     * @return mixed
     */
    public static function installPlugin($slug, $fallbackPath)
    {
        require_once ABSPATH . 'wp-admin/includes/file.php';
        require_once ABSPATH . 'wp-admin/includes/plugin.php';
        require_once ABSPATH . 'wp-admin/includes/class-wp-upgrader.php';
        require_once ABSPATH . 'wp-admin/includes/plugin-install.php';
        require_once ABSPATH . 'wp-admin/includes/class-language-pack-upgrader.php';

        // Retrieve the details of the plugin based on the slug.
        $api = plugins_api(
            'plugin_information',
            [
                'slug'   => $slug,
                'fields' => [
                    'sections'       => false,
                    'language_packs' => true,
                ],
            ]
        );

        if (is_wp_error($api)) {
            return $api;
        }

        $skin     = new \WP_Ajax_Upgrader_Skin();
        $upgrader = new \Plugin_Upgrader($skin);

        $upgrader->install($api->download_link);
        $file = $upgrader->plugin_info();

        if (AutoUpdate::isEnabled()) {
            AutoUpdate::enableAutoUpdateForPlugin($file);
        }

        // Install the language pack if available.
        $currentLocale = get_locale();
        foreach ($api->language_packs as $pack) {
            if ($pack['language'] === $currentLocale) {
                $languageUpgrader = new \Language_Pack_Upgrader($skin);
                $languageUpgrader->upgrade((object) $pack);
                break;
            }
        }

        // Activate the plugin.
        return activate_plugin($file ? $file : $fallbackPath);
    }
}
