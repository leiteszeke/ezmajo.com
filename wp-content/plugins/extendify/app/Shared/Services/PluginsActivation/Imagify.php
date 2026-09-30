<?php

namespace Extendify\Shared\Services\PluginsActivation;

defined('ABSPATH') || die('No direct access.');

class Imagify extends PluginActivation
{
    // phpcs:ignore PSR12.Properties.ConstantVisibility.NotFound
    const API_URL = 'https://app.imagify.io/api/partners/users/';

    public static function slug(): string
    {
        return 'imagify';
    }

    public static function isEligible(): bool
    {
        // A key from IMAGIFY_API_KEY or the network option reaches only their accessor.
        if (function_exists('get_imagify_option')) {
            return empty(\get_imagify_option('api_key'));
        }

        $settings = (array) \get_option('imagify_settings', []);

        return empty($settings['api_key']);
    }

    protected static function saveKey(array $data)
    {
        $key = $data['api_key'] ?? null;

        if (!$key) {
            return;
        }

        $settings = (array) \get_option('imagify_settings', []);
        $settings['api_key'] = \sanitize_text_field($key);
        \update_option('imagify_settings', $settings);

        // clear the stale validation cache.
        \delete_transient('imagify_user_cache');
    }
}
