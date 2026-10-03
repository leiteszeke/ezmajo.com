<?php

/**
 * The OAuth discovery documents for the MCP endpoint.
 */

namespace Extendify\Mcp\OAuth;

defined('ABSPATH') || die('No direct access.');

use Extendify\Config;
use Extendify\Mcp\Allowed;

/**
 * The site plays both OAuth roles: the MCP endpoint is the protected resource,
 * and extendify/v1/oauth is the authorization server.
 *
 * Nothing is served at the site root. A client finds the resource document
 * through the pointer on a 401, and the server document by appending
 * /.well-known/openid-configuration to the issuer once the root forms 404.
 */
class Metadata
{
    // phpcs:disable PSR12.Properties.ConstantVisibility.NotFound
    const AUTHORIZE_PAGE = 'extendify-mcp-authorize';

    const RESOURCE_DOCUMENT = 'oauth-protected-resource';
    // phpcs:enable PSR12.Properties.ConstantVisibility.NotFound

    /**
     * @return void
     */
    public static function register()
    {
        \add_action('rest_api_init', [self::class, 'registerRoute']);
    }

    /**
     * @return void
     */
    public static function registerRoute()
    {
        \register_rest_route(
            Config::$slug . '/' . Config::$apiVersion,
            '/oauth/\.well-known/'
                . '(?P<document>oauth-protected-resource|openid-configuration|oauth-authorization-server)',
            [
                'methods' => 'GET',
                'callback' => [self::class, 'serve'],
                // Discovery is read before any credential exists.
                'permission_callback' => '__return_true',
                'show_in_index' => false,
            ]
        );
    }

    /**
     * @param \WP_REST_Request $request - The incoming request.
     * @return \WP_REST_Response
     */
    public static function serve(\WP_REST_Request $request)
    {
        $document = $request->get_param('document') === self::RESOURCE_DOCUMENT
            ? self::protectedResource()
            : self::authorizationServer();

        return new \WP_REST_Response($document);
    }

    /**
     * @param boolean $presented - Whether the request carried a credential.
     * @return string
     */
    public static function challenge($presented)
    {
        $params = $presented ? ['error="invalid_token"'] : [];
        $params[] = 'resource_metadata="' . self::url('oauth/.well-known/' . self::RESOURCE_DOCUMENT) . '"';
        $params[] = 'scope="' . (Allowed::writable() ? 'read write' : 'read') . '"';

        return 'Bearer ' . implode(', ', $params);
    }

    /**
     * @return string
     */
    public static function resource()
    {
        return self::url('mcp');
    }

    /**
     * @param string $url - The resource a client named.
     * @return boolean
     */
    public static function isResource($url)
    {
        return self::canonical($url) === self::canonical(self::resource());
    }

    /**
     * RFC 3986: scheme and host compare case-insensitively, the path does not.
     *
     * @param string $url - A URL to compare.
     * @return string
     */
    private static function canonical($url)
    {
        $parts = \wp_parse_url($url);
        if (!is_array($parts) || empty($parts['host'])) {
            return '';
        }

        return strtolower(($parts['scheme'] ?? '') . '://' . $parts['host'])
            . (isset($parts['port']) ? ':' . $parts['port'] : '')
            . \untrailingslashit($parts['path'] ?? '')
            . (isset($parts['query']) ? '?' . $parts['query'] : '');
    }

    /**
     * @return string
     */
    public static function issuer()
    {
        return self::url('oauth');
    }

    /**
     * @return array
     */
    private static function protectedResource()
    {
        return [
            'resource' => self::resource(),
            'authorization_servers' => [self::issuer()],
            'scopes_supported' => ['read', 'write'],
            'bearer_methods_supported' => ['header'],
            'resource_name' => \wp_specialchars_decode(\get_option('blogname'), ENT_QUOTES),
        ];
    }

    /**
     * offline_access is what makes a client ask for a refresh token.
     *
     * @return array
     */
    private static function authorizationServer()
    {
        return [
            'issuer' => self::issuer(),
            'authorization_endpoint' => \admin_url('admin.php?page=' . self::AUTHORIZE_PAGE),
            'token_endpoint' => self::url('oauth/token'),
            'registration_endpoint' => self::url('oauth/register'),
            'response_types_supported' => ['code'],
            'grant_types_supported' => ['authorization_code', 'refresh_token'],
            'code_challenge_methods_supported' => ['S256'],
            'token_endpoint_auth_methods_supported' => ['none'],
            'client_id_metadata_document_supported' => true,
            'authorization_response_iss_parameter_supported' => true,
            'scopes_supported' => ['read', 'write', 'offline_access'],
        ];
    }

    /**
     * @param string $path - The route under the plugin's REST namespace.
     * @return string
     */
    private static function url($path)
    {
        return \rest_url(Config::$slug . '/' . Config::$apiVersion . '/' . $path);
    }
}
