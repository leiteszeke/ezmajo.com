<?php

/**
 * Controls Suggest Domains
 */

namespace Extendify\Assist\Controllers;

use Extendify\Constants;
use Extendify\Shared\Services\Sanitizer;

defined('ABSPATH') || die('No direct access.');

/**
 * The controller for fetching quick links
 */

class DomainsSuggestionController
{
    /**
     * The list of url strings in the site name to block from using the api.
     *
     * @var array
     */
    public static $blockList = ['instawp.xyz'];

    // phpcs:disable Generic.Metrics.CyclomaticComplexity.TooHigh
    /**
     * Return domains recommendation.
     *
     * @return \WP_REST_Response
     */
    public static function fetchDomainSuggestions()
    {
        if (!defined('EXTENDIFY_PARTNER_ID')) {
            return new \WP_REST_Response([], 200);
        }

        // Get the data directly from the database.
        $partnerData = \get_option('extendify_partner_data_v2', []);

        // Return early if neither of the banners are enabled.
        if (
            !($partnerData['showDomainBanner'] ?? false)
            && !($partnerData['showDomainTask'] ?? false)
            && !($partnerData['showSecondaryDomainBanner'] ?? false)
            && !($partnerData['showSecondaryDomainTask'] ?? false)
        ) {
            return new \WP_REST_Response([]);
        }

        $siteName = \get_bloginfo('name');

        // in case of an exact match we should not do a request.
        if (in_array(strtolower($siteName), ['wordpress', 'my blog'], true)) {
            return new \WP_REST_Response([]);
        }

        if (!self::hasValidSiteTitle($siteName)) {
            return new \WP_REST_Response([]);
        }

        $cleanedSiteTitle = self::cleanSiteTitle($siteName);
        if ($cleanedSiteTitle === '') {
            return new \WP_REST_Response([]);
        }

        $siteProfile = \get_option('extendify_site_profile', []);
        if (empty($siteProfile)) {
            return new \WP_REST_Response([]);
        }

        $businessDescription = ($siteProfile['description'] ?? '');
        $data = [
            'query' => $cleanedSiteTitle,
            'devbuild' => defined('EXTENDIFY_DEVMODE')
                ? constant('EXTENDIFY_DEVMODE')
                : is_readable(EXTENDIFY_PATH . '.devbuild'),
            'siteId' => \get_option('extendify_site_id', ''),
            'tlds' => ($partnerData['domainTLDs'] ?? []),
            'priorityTlds' => ($partnerData['priorityDomainTLDs'] ?? []),
            'partnerId' => \esc_attr(constant('EXTENDIFY_PARTNER_ID')),
            'wpLanguage' => \get_locale(),
            'wpVersion' => \get_bloginfo('version'),
            'businessDescription' => \esc_attr($businessDescription),
            'siteProfile' => $siteProfile,
        ];

        $response = \wp_remote_post(
            sprintf('%s/api/domains/suggest', Constants::AI_HOST),
            [
                'body' => \wp_json_encode($data),
                'headers' => ['Content-Type' => 'application/json'],
            ]
        );

        if (is_wp_error($response)) {
            return new \WP_REST_Response([]);
        }

        $status = \wp_remote_retrieve_response_code($response);
        if ($status < 200 || $status >= 300) {
            return new \WP_REST_Response([]);
        }

        $body = wp_remote_retrieve_body($response);
        if (empty($body)) {
            return new \WP_REST_Response([]);
        }

        return new \WP_REST_Response(json_decode($body, true), $status);
    }

    /**
     * Clean site title.
     *
     * @param string $siteTitle - The site title to clean.
     * @return string
     */
    public static function cleanSiteTitle($siteTitle)
    {
        return trim(preg_replace(
            '/[^\p{L}\p{N}\s\-]+/u',
            '',
            html_entity_decode($siteTitle, ENT_QUOTES | ENT_SUBSTITUTE | ENT_HTML401)
        ));
    }

    /**
     * Check if the site Title is part of the blocked list.
     *
     * @param string $siteTitle - The site title to check.
     * @return bool
     */
    public static function hasValidSiteTitle($siteTitle)
    {
        return empty(array_filter(self::$blockList, function ($item) use ($siteTitle) {
            // in php 8.0 we can use str_contains.
            return strpos(strtolower($siteTitle), strtolower($item)) !== false;
        }));
    }

    /**
     * Delete the cache for the domains suggestions.
     *
     * @return \WP_REST_Response
     */
    public static function deleteCache()
    {
        \delete_transient('extendify_domains');

        return new \WP_REST_Response(['success' => true]);
    }

    /**
     * Persist the tracking data
     *
     * @param \WP_REST_Request $request - The request.
     * @return \WP_REST_Response
     */
    public static function tracking($request)
    {
        $data = json_decode($request->get_param('state'), true);
        update_option('extendify_domains_recommendations_activities', Sanitizer::sanitizeArray($data));
        return new \WP_REST_Response($data);
    }
}
