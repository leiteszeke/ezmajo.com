<?php

/**
 * Imports the public suffix list.
 */

namespace Extendify\Shared\Services\ApexDomain;

defined('ABSPATH') || die('No direct access.');

use Extendify\PartnerData;

/**
 * Get the apex domain for a given URL.
 */

class ApexDomain
{
    /**
     * Get the apex domain for a given URL.
     *
     * @param string $url - The URL to get the apex domain for.
     * @return string|null
     */
    public static function getApexDomain($url)
    {
        $homeUrl = \wp_parse_url(\get_home_url(), PHP_URL_HOST);

        if (get_transient('extendify_apex_domain') && get_transient('extendify_site_url') === $homeUrl) {
            return get_transient('extendify_apex_domain');
        }

        if (!file_exists(__DIR__ . '/suffixes.php')) {
            return null;
        }

        $suffixes = require 'suffixes.php';

        if (!preg_match('~^(?:f|ht)tps?://~i', $url)) {
            $url = 'http://' . $url;
        }

        $parsed = wp_parse_url($url, PHP_URL_HOST);
        $domainParts = explode('.', $parsed);
        $domainsPartsCount = count($domainParts);

        for ($i = 0; $i < $domainsPartsCount; $i++) {
            $candidate = implode('.', array_slice($domainParts, $i));
            if (in_array($candidate, $suffixes, true)) {
                $parsed = implode('.', array_slice($domainParts, ($i - 1)));
                break;
            }
        }

        set_transient('extendify_apex_domain', $parsed);
        set_transient('extendify_home_url', $homeUrl);

        return $parsed;
    }
}
