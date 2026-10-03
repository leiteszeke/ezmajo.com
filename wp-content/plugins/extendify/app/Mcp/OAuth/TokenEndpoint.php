<?php

/**
 * The OAuth token endpoint.
 */

namespace Extendify\Mcp\OAuth;

defined('ABSPATH') || die('No direct access.');

use Extendify\Config;
use Extendify\Mcp\Availability;
use Extendify\Mcp\Grants;
use Extendify\PartnerData;

/**
 * Exchanges a code, or a refresh token, for an access token (RFC 6749 §4.1.3
 * and §6). The client posts a form and reads JSON.
 *
 * A refresh rotates: the token the client sent is gone in the same request,
 * so a copied refresh token dies as soon as the real one is used.
 */
class TokenEndpoint
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
        \register_rest_route(Config::$slug . '/' . Config::$apiVersion, '/oauth/token', [
            'methods' => 'POST',
            'callback' => [self::class, 'handle'],
            // The code or refresh token in the body is the credential.
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
        $sent = function ($key) use ($request) {
            $value = $request->get_param($key);

            return is_string($value) ? $value : '';
        };

        switch ($sent('grant_type')) {
            case 'authorization_code':
                $answer = self::fromCode($sent);
                break;
            case 'refresh_token':
                $answer = self::fromRefresh($sent);
                break;
            default:
                $answer = self::refused(
                    'unsupported_grant_type',
                    'Only authorization_code and refresh_token are offered.'
                );
        }

        $response = new \WP_REST_Response($answer, isset($answer['error']) ? 400 : 200);
        $response->header('Cache-Control', 'no-store');
        $response->header('Pragma', 'no-cache');

        return $response;
    }

    /**
     * @param callable $sent - Reads a form field, or '' for none.
     * @return array
     */
    private static function fromCode(callable $sent)
    {
        $required = ['code', 'code_verifier', 'client_id', 'redirect_uri'];
        if (in_array('', array_map($sent, $required), true)) {
            return self::refused('invalid_request', 'code, code_verifier, client_id and redirect_uri are required.');
        }

        $target = self::wrongTarget($sent('resource'));
        if ($target) {
            return $target;
        }

        $code = Availability::live() ? Tokens::redeemCode($sent('code')) : null;
        if (!$code) {
            return self::refused('invalid_grant', 'The code is unknown, spent or expired.');
        }

        if ($code['client'] !== $sent('client_id') || $sent('redirect_uri') !== $code['redirectUri']) {
            return self::refused('invalid_grant', 'The code was issued to another client or return address.');
        }

        if (!self::verifies($sent('code_verifier'), $code['codeChallenge'])) {
            return self::refused('invalid_grant', 'The code verifier does not match the challenge.');
        }

        $lifetime = $code['offline'] ? Tokens::GRANT_TTL : Tokens::ACCESS_TTL;
        $refresh = Tokens::mintGrant($code['userId'], $code['client'], $code['label'], $code['grants'], $lifetime);
        if (!$refresh) {
            return self::refused('invalid_grant', 'The user who approved can no longer manage this site.');
        }

        $grant = Tokens::findGrant($refresh);
        Tokens::markSpent($sent('code'), $grant);

        return self::issued($grant, $code['offline'] ? $refresh : null);
    }

    /**
     * @param callable $sent - Reads a form field, or '' for none.
     * @return array
     */
    private static function fromRefresh(callable $sent)
    {
        if ($sent('refresh_token') === '' || $sent('client_id') === '') {
            return self::refused('invalid_request', 'refresh_token and client_id are required.');
        }

        $target = self::wrongTarget($sent('resource'));
        if ($target) {
            return $target;
        }

        $grant = Tokens::findGrant($sent('refresh_token'));
        if ($grant) {
            PartnerData::refreshIfStale();
        }

        if (!$grant || !Availability::live() || $grant['data']['client'] !== $sent('client_id')) {
            return self::refused('invalid_grant', 'The refresh token is unknown, expired or revoked.');
        }

        if ($sent('scope') !== '' && array_diff(Grants::fromScope($sent('scope')), $grant['grants'])) {
            return self::refused('invalid_scope', 'The scope asks for more than was approved.');
        }

        $refresh = Tokens::rotateGrant($grant);

        return self::issued(Tokens::findGrant($refresh), $refresh);
    }

    /**
     * @param array       $grant   - The grant the tokens act under.
     * @param string|null $refresh - The refresh token to hand out, if any.
     * @return array
     */
    private static function issued(array $grant, $refresh)
    {
        $scope = $grant['grants'];
        if ($refresh !== null) {
            $scope[] = 'offline_access';
        }

        $body = [
            'access_token' => Tokens::mintAccess($grant),
            'token_type' => 'Bearer',
            'expires_in' => Tokens::ACCESS_TTL,
            'scope' => implode(' ', $scope),
        ];
        if ($refresh !== null) {
            $body['refresh_token'] = $refresh;
        }

        return $body;
    }

    /**
     * @param string $verifier  - The code_verifier the client sent.
     * @param string $challenge - The S256 challenge the authorization request carried.
     * @return boolean
     */
    private static function verifies($verifier, $challenge)
    {
        $hashed = rtrim(strtr(base64_encode(hash('sha256', $verifier, true)), '+/', '-_'), '=');

        return hash_equals((string) $challenge, $hashed);
    }

    /**
     * @param string $resource - The resource the client named, or '' for none.
     * @return array|null - The refusal, or null when the request stands.
     */
    private static function wrongTarget($resource)
    {
        if ($resource === '' || Metadata::isResource($resource)) {
            return null;
        }

        return self::refused('invalid_target', 'The token is for a different site or endpoint.');
    }

    /**
     * @param string $error       - An RFC 6749 §5.2 error code.
     * @param string $description - What went wrong, for the client's log.
     * @return array
     */
    private static function refused($error, $description)
    {
        return ['error' => $error, 'error_description' => $description];
    }
}
