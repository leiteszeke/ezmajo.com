<?php

/**
 * SimplyBook pattern replacement.
 */

namespace Extendify\Shared\Services\PluginDependencies;

use Extendify\Constants;
use Extendify\PartnerData;
use Extendify\Shared\Services\HttpClient;
use Extendify\Shared\Services\Sanitizer;

defined('ABSPATH') || die('No direct access.');

/**
 * SimplyBook pattern replacement class.
 */

class SimplyBook
{
    /**
     * The plugin slug.
     *
     * @var string
     */
    public static $slug = 'simplybook/simplybook.php';

    /**
     * Replace the placeholder for SimplyBook.
     *
     * @param mixed  $code    - The code data.
     * @param string $key     - The plugin key.
     * @param string $newCode - The plugin pattern code.
     * @return mixed
     */
    public static function create($code, $key, $newCode)
    {
        if ($key !== 'simple' || !preg_match('/\[simplybook_widget\]|wp:simplybook\/widget/m', $newCode)) {
            return $code;
        }

        require_once ABSPATH . 'wp-admin/includes/plugin.php';

        // If the plugin is already installed and active, we don't need to install it again.
        if (!is_plugin_active(self::$slug)) {
            $response = PluginInstaller::installPlugin('simplybook', self::$slug);
            if (is_wp_error($response)) {
                return $response;
            }
        }

        return $newCode;
    }

    public static function getIndustryCode()
    {
        if (!empty(\get_option('extendify_simplybook_data', []))) {
            return;
        }

        $response = HttpClient::post(Constants::AI_HOST . '/api/plugins/simplybook', [
            'params' => [
                'title' => \get_bloginfo('name'),
                'wpLanguage' => \get_locale(),
                'version' => \Extendify\Config::$version,
                'siteProfile' => \get_option('extendify_site_profile', []),
                'siteId' => \get_option('extendify_site_id', ''),
                'partnerId' => PartnerData::$id,
                'devbuild' => (bool) is_readable(EXTENDIFY_PATH . '.devbuild'),
            ]
        ], null, true);

        if (empty($response['response'])) {
            return;
        }

        \update_option('extendify_simplybook_data', Sanitizer::sanitizeUnknown($response['response'] ?? []), false);

        return;
    }
}
