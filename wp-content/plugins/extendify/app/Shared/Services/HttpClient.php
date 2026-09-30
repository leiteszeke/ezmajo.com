<?php

/**
 * HTTP Client utility for making secure requests
 */

namespace Extendify\Shared\Services;

use Extendify\Config;
use Extendify\PartnerData;

defined('ABSPATH') || die('No direct access.');

/**
 * Utility class for making secure HTTP requests with WordPress data
 */
class HttpClient
{
    /**
     * Build WordPress environment parameters
     *
     * @param \WP_REST_Request|null $request - Optional request object
     * @param array $additionalParams - Additional parameters to merge
     * @return array
     */
    public static function buildParams($request = null, $additionalParams = [])
    {
        $params = [
            'wp_language' => \get_locale(),
            'wp_theme' => \get_option('template'),
            'wp_version' => \get_bloginfo('version'),
            'mode' => Config::$environment,
            'library_version' => Config::$version,
            'wp_active_plugins' => ($request && $request->get_method() === 'POST') ? \get_option('active_plugins') : [],
            'is_block_theme' => function_exists('wp_is_block_theme') ? wp_is_block_theme() : false,
            'sdk_partner' => PartnerData::$id,
        ];

        // Add devmode if header is set
        if ($request && $request->get_header('x_extendify_dev_mode') === 'true') {
            $params['devmode'] = true;
        }

        return array_merge($params, $additionalParams);
    }

    /**
     * Build headers
     *
     * @param \WP_REST_Request|null $request - Optional request object
     * @param array $additionalHeaders - Additional headers to merge
     * @return array
     */
    public static function buildHeaders($request = null, $additionalHeaders = [])
    {
        $headers = [
            'Accept' => 'application/json',
        ];

        if ($request) {
            $headers['referer'] = $request->get_header('referer');
            $headers['user_agent'] = $request->get_header('user_agent');
        }

        return array_filter(array_merge($headers, $additionalHeaders));
    }

    /**
     * Make a GET request with WordPress parameters and proper error handling
     *
     * @param string $url - Base URL for the request
     * @param array $extra - Array containing 'params' and/or 'headers' keys for additional data
     * @param \WP_REST_Request|null $request - Optional request object for headers
     * @return array - Array containing 'response' data and 'code' status
     */
    public static function get($url, $extra = [], $request = null)
    {
        $params = self::buildParams($request, $extra['params'] ?? []);
        $headers = self::buildHeaders($request, $extra['headers'] ?? []);

        $requestUrl = \add_query_arg(
            \urlencode_deep(\urldecode_deep($params)),
            $url
        );

        $response = \wp_safe_remote_get($requestUrl, ['headers' => $headers]);

        // If there was an error, return 500
        if (\is_wp_error($response) || \wp_remote_retrieve_response_code($response) !== 200) {
            return ['response' => [], 'code' => 500];
        }

        $result = json_decode(\wp_remote_retrieve_body($response), true);

        // Validate JSON decode was successful and has expected structure
        if (json_last_error() !== JSON_ERROR_NONE || !is_array($result)) {
            return ['response' => [], 'code' => 500];
        }

        return ['response' => $result, 'code' => 200];
    }

    /**
     * Make a POST request with WordPress parameters and proper error handling
     *
     * @param string $url - Base URL for the request
     * @param array $extra - Array containing 'params' and/or 'headers' keys for additional data
     * @param \WP_REST_Request|null $request - Optional request object for headers
     * @param bool $encode - Whether to JSON encode the body (default: false)
     * @return array - Array containing 'response' data and 'code' status
     */
    public static function post($url, $extra = [], $request = null, $encode = false)
    {
        $body = self::buildParams($request, $extra['params'] ?? []);
        $headers = self::buildHeaders($request, $extra['headers'] ?? []);

        $response = \wp_safe_remote_post($url, [
            'headers' => $headers,
            'body' => $encode ? \wp_json_encode($body) : $body,
        ]);

        // If there was an error, return 500
        if (\is_wp_error($response) || \wp_remote_retrieve_response_code($response) !== 200) {
            return ['response' => [], 'code' => 500];
        }

        $result = json_decode(\wp_remote_retrieve_body($response), true);

        // Validate JSON decode was successful and has expected structure
        if (json_last_error() !== JSON_ERROR_NONE || !is_array($result)) {
            return ['response' => [], 'code' => 500];
        }

        return ['response' => $result, 'code' => 200];
    }
}
