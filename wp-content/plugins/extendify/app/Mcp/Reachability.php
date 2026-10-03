<?php

/**
 * Whether an MCP client outside this site could reach its endpoint.
 */

namespace Extendify\Mcp;

defined('ABSPATH') || die('No direct access.');

use Extendify\Mcp\OAuth\Metadata;

/**
 * DNS is never resolved: a host's own view of its domain is often a private address.
 */
class Reachability
{
    // phpcs:ignore PSR12.Properties.ConstantVisibility.NotFound
    const LOCAL_SUFFIXES = '/(^|\.)(localhost|local|test|internal|lan|home|home\.arpa|invalid|example)$/i';

    /**
     * @return string|null local, http, auth or blocked; null when nothing stands in the way.
     */
    public static function obstacle()
    {
        $url = Metadata::resource();
        $parts = \wp_parse_url($url);

        if (self::isLocal(trim((string) ($parts['host'] ?? ''), '[]'))) {
            return 'local';
        }

        if (($parts['scheme'] ?? '') !== 'https') {
            return 'http';
        }

        return self::loopback($url);
    }

    /**
     * @param string $host - The host part of the site's address, brackets stripped.
     * @return boolean
     */
    private static function isLocal($host)
    {
        if (filter_var($host, FILTER_VALIDATE_IP)) {
            return !filter_var($host, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE);
        }

        return strpos($host, '.') === false || (bool) preg_match(self::LOCAL_SUFFIXES, $host);
    }

    /**
     * Many hosts cannot reach themselves, and some answer a self-request with an empty 200.
     * The verdict is kept for a few minutes: the request has a five-second timeout and runs on every page load.
     *
     * @param string $url - The endpoint as a client would see it.
     * @return string|null
     */
    private static function loopback($url)
    {
        $key = 'extendify_mcp_reach_' . md5($url);
        $kept = \get_transient($key);
        if (is_array($kept)) {
            return $kept['obstacle'];
        }

        $obstacle = self::ask($url);
        \set_transient($key, ['obstacle' => $obstacle], 5 * MINUTE_IN_SECONDS);

        return $obstacle;
    }

    /**
     * @param string $url - The endpoint as a client would see it.
     * @return string|null
     */
    private static function ask($url)
    {
        $response = \wp_remote_post($url, [
            'timeout' => 5,
            'sslverify' => false,
            'headers' => ['Content-Type' => 'application/json', 'Accept' => 'application/json'],
            'body' => \wp_json_encode(['jsonrpc' => '2.0', 'id' => 1, 'method' => 'initialize']),
        ]);
        $raw = \is_wp_error($response) ? '' : \wp_remote_retrieve_body($response);
        if (trim($raw) === '') {
            return null;
        }

        $body = json_decode($raw, true);
        if (($body['code'] ?? '') === 'extendify_mcp_unauthorized') {
            return null;
        }

        $challenged = \wp_remote_retrieve_response_code($response) === 401
            && \wp_remote_retrieve_header($response, 'www-authenticate');

        return $challenged ? 'auth' : 'blocked';
    }
}
