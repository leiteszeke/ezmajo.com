<?php

/**
 * WooCommerce pattern replacement.
 */

namespace Extendify\Shared\Services\PluginDependencies;

defined('ABSPATH') || die('No direct access.');

/**
 * WooCommerce pattern replacement class.
 */

class WooCommerce
{
    /**
     * The plugin slug.
     *
     * @var string
     */
    public static $slug = 'woocommerce/woocommerce.php';

    /**
     * Replace the placeholder for WooCommerce.
     *
     * @param mixed  $code    - The code data.
     * @param string $key     - The plugin key.
     * @param string $newCode - The plugin pattern code.
     * @return mixed
     */
    public static function create($code, $key, $newCode)
    {
        if ($key !== 'simple' || !preg_match('/wp:woocommerce/m', $newCode)) {
            return $code;
        }

        require_once ABSPATH . 'wp-admin/includes/plugin.php';

        // If the plugin is already installed and active, we don't need to install it again.
        if (!is_plugin_active(self::$slug)) {
            $response = PluginInstaller::installPlugin('woocommerce', self::$slug);
            if (is_wp_error($response)) {
                return $response;
            }
        }

        if (!preg_match_all('/"categoryId":\s?\"?(\d+)\"?/', $newCode, $matches, PREG_SET_ORDER)) {
            return $newCode;
        }

        $categories = array_map(function ($item) {
            return [
                'id' => $item->term_id,
                'url' => get_term_link($item->term_id, 'product_cat'),
            ];
        }, get_terms(['taxonomy' => 'product_cat']));

        foreach ($matches as $key => $value) {
            // Replace the temporary id with the category id.
            $newCode = preg_replace(
                '/' . preg_quote($value[0], '/') . '/',
                str_replace($value[1], $categories[$key]['id'], $value[0]),
                $newCode,
                1
            );

            // Replace the temporary placeholder URL with the actual category URL.
            $newCode = preg_replace(
                '/' . preg_quote('http://patterns.test/?product_cat=accessories', '/') . '/',
                $categories[$key]['url'],
                $newCode,
                1
            );
        }

        return $newCode;
    }
}
