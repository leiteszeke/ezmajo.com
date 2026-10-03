<?php

/**
 * The credentials an OAuth client is issued.
 */

namespace Extendify\Mcp\OAuth;

defined('ABSPATH') || die('No direct access.');

use Extendify\Mcp\Connections;
use Extendify\Mcp\Grants;

/**
 * A row is keyed by the token's HMAC and never holds the token, so a copy of
 * the database opens nothing.
 */
class Tokens
{
    // phpcs:disable PSR12.Properties.ConstantVisibility.NotFound
    const LENGTH = 32;

    const CODE_TTL = 60;

    const SPENT_TTL = 10 * MINUTE_IN_SECONDS;

    const ACCESS_TTL = HOUR_IN_SECONDS;

    const GRANT_TTL = 30 * DAY_IN_SECONDS;

    const CODE_PREFIX = 'extendify_mcp_code_';

    const ACCESS_PREFIX = 'extendify_mcp_access_';
    // phpcs:enable PSR12.Properties.ConstantVisibility.NotFound

    /**
     * @param array $payload - What the authorization request settled on.
     * @return string
     */
    public static function mintCode(array $payload)
    {
        $code = self::random();
        \set_transient(self::CODE_PREFIX . self::hash($code), $payload, self::CODE_TTL);

        return $code;
    }

    /**
     * @param mixed $code - The code the client sent to the token endpoint.
     * @return array|null
     */
    public static function redeemCode($code)
    {
        if (!is_string($code) || $code === '') {
            return null;
        }

        $key = self::CODE_PREFIX . self::hash($code);
        $payload = \get_transient($key);
        if (!is_array($payload)) {
            return null;
        }

        \delete_transient($key);
        if (isset($payload['spentFor'])) {
            // A second presentation means one of the two was not the client's (RFC 6749 §4.1.2).
            Connections::revoke($payload['spentFor']['userId'], $payload['spentFor']['id']);
            return null;
        }

        return $payload;
    }

    /**
     * @param string $code  - The code just exchanged.
     * @param array  $grant - The grant the exchange issued.
     * @return void
     */
    public static function markSpent($code, array $grant)
    {
        \set_transient(self::CODE_PREFIX . self::hash($code), [
            'spentFor' => ['userId' => $grant['userId'], 'id' => $grant['id']],
        ], self::SPENT_TTL);
    }

    /**
     * @param integer $userId   - The user the assistant acts as.
     * @param string  $client   - The client id the assistant authorized under.
     * @param string  $label    - The name the client goes by.
     * @param array   $grants   - What the user allowed.
     * @param integer $lifetime - Seconds until the grant expires unrefreshed.
     * @return string|null
     */
    public static function mintGrant($userId, $client, $label, array $grants, $lifetime = self::GRANT_TTL)
    {
        // Without this, any logged-in subscriber could authorize an assistant on the site.
        if (!\user_can((int) $userId, 'manage_options')) {
            return null;
        }

        return self::store((int) $userId, [
            // A refresh moves the row to a new key; the id is what stays.
            'id' => \wp_generate_uuid4(),
            'client' => \sanitize_text_field($client),
            'label' => mb_substr(\sanitize_text_field($label), 0, Connections::LABEL_LENGTH),
            'grants' => Grants::sanitize($grants),
            'created' => time(),
            'lastUsed' => 0,
            'expires' => time() + $lifetime,
            'salt' => Connections::fingerprint(),
        ]);
    }

    /**
     * Access tokens minted under the old row die with it.
     *
     * @param array $grant - The grant a refresh token was just presented for.
     * @return string - The refresh token that replaces the one presented.
     */
    public static function rotateGrant(array $grant)
    {
        $data = $grant['data'];
        $data['expires'] = time() + self::GRANT_TTL;
        $token = self::store($grant['userId'], $data);
        \delete_user_meta($grant['userId'], $grant['metaKey']);

        return $token;
    }

    /**
     * @param mixed $token - The refresh token the client sent.
     * @return array|null
     */
    public static function findGrant($token)
    {
        if (!is_string($token) || $token === '') {
            return null;
        }

        $key = self::grantKey($token);
        $wpdb = $GLOBALS['wpdb'];
        $row = $wpdb->get_row($wpdb->prepare(
            "SELECT user_id, meta_value FROM {$wpdb->usermeta} WHERE meta_key = %s LIMIT 1",
            $key
        ));

        return $row ? self::grant((int) $row->user_id, $key, (array) \maybe_unserialize($row->meta_value)) : null;
    }

    /**
     * @param array $grant - The grant the token acts under.
     * @return string
     */
    public static function mintAccess(array $grant)
    {
        $token = self::random();
        \set_transient(self::ACCESS_PREFIX . self::hash($token), [
            'userId' => $grant['userId'],
            'metaKey' => $grant['metaKey'],
        ], self::ACCESS_TTL);

        return $token;
    }

    /**
     * The grant is read here, so revoking one ends its access tokens with it.
     *
     * @param mixed $token - The token from the Authorization header.
     * @return array|null
     */
    public static function findAccess($token)
    {
        if (!is_string($token) || $token === '') {
            return null;
        }

        $held = \get_transient(self::ACCESS_PREFIX . self::hash($token));
        if (!is_array($held)) {
            return null;
        }

        $data = \get_user_meta($held['userId'], $held['metaKey'], true);

        return is_array($data) ? self::grant($held['userId'], $held['metaKey'], $data) : null;
    }

    /**
     * @param integer $userId  - The user the grant belongs to.
     * @param string  $metaKey - The row the grant lives in.
     * @param array   $data    - What the row holds.
     * @return array|null
     */
    private static function grant($userId, $metaKey, array $data)
    {
        if (($data['expires'] ?? 0) < time()) {
            return null;
        }

        return [
            'userId' => $userId,
            'metaKey' => $metaKey,
            'id' => (string) ($data['id'] ?? ''),
            'grants' => Grants::sanitize($data['grants'] ?? null),
            'data' => $data,
        ];
    }

    /**
     * @param integer $userId - The user the grant belongs to.
     * @param array   $data   - The row to write.
     * @return string - The refresh token the row is keyed by.
     */
    private static function store($userId, array $data)
    {
        $token = self::random();
        \update_user_meta($userId, self::grantKey($token), $data);

        return $token;
    }

    /**
     * @return string
     */
    private static function random()
    {
        return \wp_generate_password(self::LENGTH, false, false);
    }

    /**
     * @param string $token - The token to key a row by.
     * @return string
     */
    private static function hash($token)
    {
        return hash_hmac('sha256', $token, Connections::secret());
    }

    /**
     * A refresh arrives with a token and no user, and only meta_key is indexed.
     *
     * @param string $token - The refresh token to key the row by.
     * @return string
     */
    private static function grantKey($token)
    {
        return Connections::prefix() . self::hash($token);
    }
}
