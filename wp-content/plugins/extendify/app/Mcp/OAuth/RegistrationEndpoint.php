<?php

/**
 * The OAuth dynamic client registration endpoint.
 */

namespace Extendify\Mcp\OAuth;

defined('ABSPATH') || die('No direct access.');

use Extendify\Config;

/**
 * A client that publishes no metadata document registers here first (RFC 7591)
 * and is handed an id; nothing else about it is verified.
 */
class RegistrationEndpoint
{
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
        \register_rest_route(Config::$slug . '/' . Config::$apiVersion, '/oauth/register', [
            'methods' => 'POST',
            'callback' => [self::class, 'handle'],
            // Registration comes before any credential exists; Clients caps what a stranger can fill.
            'permission_callback' => '__return_true',
            'show_in_index' => false,
        ]);
    }

    /**
     * @param \WP_REST_Request $request - The incoming request.
     * @return \WP_REST_Response
     */
    public static function handle(\WP_REST_Request $request)
    {
        $sent = $request->get_json_params();
        if (!is_array($sent)) {
            return self::answer(400, [
                'error' => 'invalid_client_metadata',
                'error_description' => 'The registration must be a JSON object.',
            ]);
        }

        $uris = is_array($sent['redirect_uris'] ?? null) ? array_values($sent['redirect_uris']) : [];
        $acceptable = array_filter($uris, function ($uri) {
            return is_string($uri) && Clients::acceptableRedirect($uri);
        });
        if (!$uris || count($uris) > Clients::MAX_REDIRECTS || count($acceptable) !== count($uris)) {
            return self::answer(400, [
                'error' => 'invalid_redirect_uri',
                'error_description' => sprintf(
                    'Send up to %d redirect URIs, each https or http on a loopback address,'
                        . ' with no fragment and at most %d characters.',
                    Clients::MAX_REDIRECTS,
                    Clients::MAX_REDIRECT_LENGTH
                ),
            ]);
        }

        $name = is_string($sent['client_name'] ?? null) ? $sent['client_name'] : '';
        $client = Clients::register($name, $uris);

        return self::answer(201, [
            'client_id' => $client['id'],
            'client_id_issued_at' => time(),
            'client_name' => $client['name'],
            'redirect_uris' => $client['redirectUris'],
            'token_endpoint_auth_method' => 'none',
            'grant_types' => ['authorization_code', 'refresh_token'],
            'response_types' => ['code'],
        ]);
    }

    /**
     * @param integer $status - The HTTP status.
     * @param array   $body   - The JSON body.
     * @return \WP_REST_Response
     */
    private static function answer($status, array $body)
    {
        $response = new \WP_REST_Response($body, $status);
        $response->header('Cache-Control', 'no-store');
        $response->header('Pragma', 'no-cache');

        return $response;
    }
}
