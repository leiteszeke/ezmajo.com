<?php

/**
 * The OAuth clients that may ask to be authorized.
 */

namespace Extendify\Mcp\OAuth;

defined('ABSPATH') || die('No direct access.');

use Extendify\Mcp\Connections;

/**
 * A client id is the https URL of its metadata document, which names the
 * addresses the client may be sent back to, or an id this site handed out
 * to a client that registered without one.
 */
class Clients
{
    // phpcs:disable PSR12.Properties.ConstantVisibility.NotFound
    const CACHE_PREFIX = 'extendify_mcp_client_';

    const OPTION = 'extendify_oauth_clients';

    /**
     * Registration is unauthenticated, so the store is bounded.
     */
    const CAP = 200;

    const MAX_REDIRECTS = 10;

    const MAX_REDIRECT_LENGTH = 2048;

    const IDLE_TTL = 30 * DAY_IN_SECONDS;

    const LOOPBACK_HOSTS = ['localhost', '127.0.0.1', '[::1]'];
    // phpcs:enable PSR12.Properties.ConstantVisibility.NotFound

    /**
     * @param mixed $clientId - The client_id the request named.
     * @return array|null
     */
    public static function find($clientId)
    {
        if (!is_string($clientId) || $clientId === '') {
            return null;
        }

        return self::isDocumentUrl($clientId) ? self::fromDocument($clientId) : self::registered($clientId);
    }

    /**
     * @param string $name         - The name the client gave, or '' for none.
     * @param array  $redirectUris - The addresses it may be sent back to, already checked.
     * @return array - The client as find() returns it.
     */
    public static function register($name, array $redirectUris)
    {
        $now = time();
        $clients = array_filter(self::all(), function ($client) use ($now) {
            return max($client['created'], $client['lastUsed']) > $now - self::IDLE_TTL;
        });
        uasort($clients, function ($a, $b) {
            return max($a['created'], $a['lastUsed']) <=> max($b['created'], $b['lastUsed']);
        });
        while (count($clients) >= self::CAP) {
            array_shift($clients);
        }

        $id = \wp_generate_password(32, false, false);
        $name = \sanitize_text_field($name) ?: \__('Unnamed assistant', 'extendify-local');
        $clients[$id] = [
            'name' => mb_substr($name, 0, Connections::LABEL_LENGTH),
            'redirectUris' => array_values($redirectUris),
            'created' => $now,
            'lastUsed' => 0,
        ];
        \update_option(self::OPTION, $clients, false);

        return ['id' => $id, 'name' => $clients[$id]['name'], 'redirectUris' => $clients[$id]['redirectUris']];
    }

    /**
     * Plain http is refused except to the user's own computer: a code sent
     * over it could be read on the way.
     *
     * @param string $uri - A redirect URI a client wants registered.
     * @return boolean
     */
    public static function acceptableRedirect($uri)
    {
        if (strlen($uri) > self::MAX_REDIRECT_LENGTH) {
            return false;
        }

        $parts = \wp_parse_url($uri);
        if (!is_array($parts) || empty($parts['host']) || isset($parts['fragment'])) {
            return false;
        }

        return ($parts['scheme'] ?? '') === 'https' || self::isLoopback($uri);
    }

    /**
     * @param string $url - The client id, an https URL.
     * @return array|null
     */
    private static function fromDocument($url)
    {
        $key = self::CACHE_PREFIX . md5($url);
        $held = \get_transient($key);
        if (is_array($held)) {
            return $held;
        }

        $client = self::fetch($url);
        if ($client) {
            \set_transient($key, $client, HOUR_IN_SECONDS);
        }

        return $client;
    }

    /**
     * @param string $id - The client id this site handed out.
     * @return array|null
     */
    private static function registered($id)
    {
        $clients = self::all();
        if (!isset($clients[$id])) {
            return null;
        }

        $clients[$id]['lastUsed'] = time();
        \update_option(self::OPTION, $clients, false);

        return [
            'id' => $id,
            'name' => $clients[$id]['name'],
            'redirectUris' => $clients[$id]['redirectUris'],
        ];
    }

    /**
     * @return array - Registered clients by id.
     */
    private static function all()
    {
        $clients = \get_option(self::OPTION, []);

        return is_array($clients) ? $clients : [];
    }

    /**
     * @param array  $client - The client as found.
     * @param string $uri    - The redirect_uri the request named, or '' for none.
     * @return string|null - The address to send the client back to.
     */
    public static function redirect(array $client, $uri)
    {
        if ($uri === '') {
            return count($client['redirectUris']) === 1 ? $client['redirectUris'][0] : null;
        }

        foreach ($client['redirectUris'] as $registered) {
            if ($registered === $uri) {
                return $uri;
            }

            // A program on the user's computer binds a fresh port each run (RFC 8252 §7.3).
            if (
                self::isLoopback($registered) && self::isLoopback($uri)
                && self::withoutPort($registered) === self::withoutPort($uri)
            ) {
                return $uri;
            }
        }

        return null;
    }

    /**
     * @param array $client - The client as found.
     * @return boolean
     */
    public static function onThisComputerOnly(array $client)
    {
        foreach ($client['redirectUris'] as $uri) {
            if (!self::isLoopback($uri)) {
                return false;
            }
        }

        return true;
    }

    /**
     * @param string $uri - A redirect URI.
     * @return boolean
     */
    private static function isLoopback($uri)
    {
        $parts = \wp_parse_url($uri);

        return is_array($parts)
            && ($parts['scheme'] ?? '') === 'http'
            && in_array($parts['host'] ?? '', self::LOOPBACK_HOSTS, true);
    }

    /**
     * @param string $uri - A loopback redirect URI.
     * @return string
     */
    private static function withoutPort($uri)
    {
        return preg_replace('#^(http://(?:\[[^\]]+\]|[^/:]+)):\d+#', '$1', $uri);
    }

    /**
     * @param string $url - The client id.
     * @return boolean
     */
    private static function isDocumentUrl($url)
    {
        $parts = \wp_parse_url($url);

        return is_array($parts)
            && ($parts['scheme'] ?? '') === 'https'
            && !empty($parts['host'])
            && !isset($parts['fragment'])
            && !isset($parts['user'])
            && !isset($parts['pass']);
    }

    /**
     * @param string $url - The client id.
     * @return array|null
     */
    private static function fetch($url)
    {
        $response = \wp_safe_remote_get($url, [
            'timeout' => 5,
            // A redirected document could not claim the URL it was fetched from.
            'redirection' => 0,
            'limit_response_size' => 64 * KB_IN_BYTES,
            'headers' => ['Accept' => 'application/json'],
        ]);
        if (\is_wp_error($response) || \wp_remote_retrieve_response_code($response) !== 200) {
            return null;
        }

        $document = json_decode(\wp_remote_retrieve_body($response), true);
        if (!is_array($document) || ($document['client_id'] ?? null) !== $url) {
            return null;
        }

        $uris = is_array($document['redirect_uris'] ?? null) ? $document['redirect_uris'] : [];
        $uris = array_values(array_filter($uris, function ($uri) {
            return is_string($uri) && self::acceptableRedirect($uri);
        }));
        if (!$uris) {
            return null;
        }

        $name = is_string($document['client_name'] ?? null) ? \sanitize_text_field($document['client_name']) : '';

        return [
            'id' => $url,
            'name' => mb_substr($name ?: (string) \wp_parse_url($url, PHP_URL_HOST), 0, Connections::LABEL_LENGTH),
            'redirectUris' => $uris,
        ];
    }
}
