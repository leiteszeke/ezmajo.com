<?php

/**
 * Manage WordPress auto-updates for Extendify.
 */

namespace Extendify\Shared\Services\AutoUpdate;

defined('ABSPATH') || die('No direct access.');

use Extendify\PartnerData;

/**
 * Enables auto-updates for plugins we install, plus a launch-time enable for
 * the Extendable theme, WordPress core, and Extendify itself.
 */

class AutoUpdate
{
    /**
     * Whether the auto-update feature is enabled for this site.
     *
     * @return boolean
     */
    public static function isEnabled()
    {
        return PartnerData::setting('useAutoUpdate')
            || (defined('EXTENDIFY_DEVMODE') && constant('EXTENDIFY_DEVMODE'));
    }

    /**
     * Opt a plugin into auto-updates (only ever adds; never installs or
     * activates the plugin).
     *
     * @param string|null $pluginFile - The plugin file, e.g. "woocommerce/woocommerce.php".
     * @return void
     */
    public static function enableAutoUpdateForPlugin($pluginFile)
    {
        if (!$pluginFile) {
            return;
        }

        if (!function_exists('get_plugins')) {
            require_once ABSPATH . 'wp-admin/includes/plugin.php';
        }

        // Only opt in plugins that are actually installed.
        if (!array_key_exists($pluginFile, get_plugins())) {
            return;
        }

        self::addToAutoUpdateList('auto_update_plugins', $pluginFile);
    }

    /**
     * Enable automatic updates for all WordPress core releases.
     *
     * @return void
     */
    public static function enableAutoUpdateForCore()
    {
        update_option('auto_update_core_major', 'enabled');
    }

    /**
     * Append a value to one of WordPress' auto-update list options if missing.
     *
     * @param string $optionKey - The option name (auto_update_plugins/themes).
     * @param string $value     - The plugin file or theme stylesheet to add.
     * @return void
     */
    public static function addToAutoUpdateList($optionKey, $value)
    {
        $enabled = (array) get_option($optionKey, []);
        if (in_array($value, $enabled, true)) {
            return;
        }

        $enabled[] = $value;
        update_option($optionKey, $enabled);
    }
}
