<?php

namespace Extendify\Shared\Services\PluginsActivation;

defined('ABSPATH') || die('No direct access.');

class TranslatePress extends PluginActivation
{
    // phpcs:ignore PSR12.Properties.ConstantVisibility.NotFound
    const API_URL = 'https://translatepress.com/wp-json/tpext/v1/free-license';

    public static function slug(): string
    {
        return 'translatepress-multilingual';
    }

    public static function isEligible(): bool
    {
        return empty(\get_option('trp_license_key'));
    }

    protected static function saveKey(array $data)
    {
        $key = $data['license_key'] ?? null;

        if (!$key) {
            return;
        }

        \update_option('trp_license_key', \sanitize_text_field($key));
    }
}
