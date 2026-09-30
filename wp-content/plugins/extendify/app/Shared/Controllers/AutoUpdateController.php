<?php

/**
 * Controller for enabling plugin auto-updates.
 */

namespace Extendify\Shared\Controllers;

defined('ABSPATH') || die('No direct access.');

use Extendify\Shared\Services\AutoUpdate\AutoUpdate;

/**
 * Opts a plugin we installed into WordPress auto-updates.
 */

class AutoUpdateController
{
    /**
     * Enable auto-updates for a plugin we just installed.
     *
     * @param \WP_REST_Request $request - The request.
     * @return \WP_REST_Response
     */
    public static function enable($request)
    {
        $plugin = sanitize_text_field((string) $request->get_param('plugin'));
        if (AutoUpdate::isEnabled() && $plugin) {
            // The WP install response gives the plugin file without its ".php".
            AutoUpdate::enableAutoUpdateForPlugin(plugin_basename($plugin . '.php'));
        }

        return new \WP_REST_Response(['success' => true]);
    }
}
