<?php

/**
 * The AI assistants a user has authorized.
 */

namespace Extendify\Mcp;

defined('ABSPATH') || die('No direct access.');

/**
 * One usermeta row per authorized assistant; OAuth\Tokens mints and finds them.
 */
class Connections
{
    // phpcs:disable PSR12.Properties.ConstantVisibility.NotFound
    /**
     * The client names itself, and the name lands in a usermeta row and a table cell.
     */
    const LABEL_LENGTH = 80;
    // phpcs:enable PSR12.Properties.ConstantVisibility.NotFound

    /**
     * @param integer $userId - The user whose connections to list.
     * @return array
     */
    public static function all($userId)
    {
        $wpdb = $GLOBALS['wpdb'];
        $rows = $wpdb->get_results($wpdb->prepare(
            "SELECT meta_key, meta_value FROM {$wpdb->usermeta} WHERE user_id = %d AND meta_key LIKE %s",
            (int) $userId,
            $wpdb->esc_like(self::prefix()) . '%'
        ));

        $connections = [];
        foreach ($rows ?: [] as $row) {
            $data = (array) \maybe_unserialize($row->meta_value);
            // Nothing else prunes an expired grant's row.
            if (isset($data['expires']) && $data['expires'] < time()) {
                \delete_user_meta((int) $userId, $row->meta_key);
                continue;
            }

            $connection = array_merge(
                ['id' => '', 'label' => '', 'created' => 0, 'lastUsed' => 0, 'salt' => ''],
                $data,
                ['key' => $row->meta_key]
            );
            $connection['grants'] = Grants::sanitize($connection['grants'] ?? null);
            $connection['invalidated'] = $connection['salt'] !== ''
                && !hash_equals($connection['salt'], self::fingerprint());
            $connections[] = $connection;
        }

        usort($connections, function ($a, $b) {
            return $b['created'] <=> $a['created'];
        });

        return $connections;
    }

    /**
     * @param integer $userId - The user whose connections to describe.
     * @return array - What a screen would have to redraw for: how many, and the newest.
     */
    public static function state($userId)
    {
        $created = array_column(self::all($userId), 'created');

        return ['count' => count($created), 'newest' => $created ? (int) max($created) : 0];
    }

    /**
     * @param integer $userId - The user the connection belongs to.
     * @param string  $id     - The connection's id.
     * @return boolean
     */
    public static function revoke($userId, $id)
    {
        if ($id === '') {
            return false;
        }

        foreach (self::all($userId) as $connection) {
            if ($connection['id'] === $id) {
                return self::end($userId, $connection);
            }
        }

        return false;
    }

    /**
     * @param integer $userId - The user whose connections to end.
     * @return void
     */
    public static function revokeAll($userId)
    {
        foreach (self::all($userId) as $connection) {
            self::end($userId, $connection);
        }
    }

    /**
     * @param integer $userId     - The user the connection belongs to.
     * @param array   $connection - The connection as all() lists it.
     * @return boolean
     */
    private static function end($userId, array $connection)
    {
        Log::forget($userId, $connection['id']);

        return (bool) \delete_user_meta((int) $userId, $connection['key']);
    }

    /**
     * @param array $connection - The connection a request just arrived on.
     * @return void
     */
    public static function touch(array $connection)
    {
        $data = $connection['data'];
        $data['lastUsed'] = time();

        // update_user_meta() would re-add a row that a revoke or a refresh deleted mid-call.
        $wpdb = $GLOBALS['wpdb'];
        $wpdb->update(
            $wpdb->usermeta,
            ['meta_value' => \maybe_serialize($data)],
            ['user_id' => (int) $connection['userId'], 'meta_key' => $connection['metaKey']]
        );
        \wp_cache_delete((int) $connection['userId'], 'user_meta');
    }

    /**
     * A clone copies the database and the salts, so the salt alone is not this site.
     * home_url() is filtered per request, so it would hash one token two ways.
     * Pinned to https so moving the site to https keeps its tokens.
     *
     * @return string
     */
    public static function secret()
    {
        return \wp_salt('auth') . '|' . \set_url_scheme(\get_option('home'), 'https');
    }

    /**
     * A row minted under a changed salt or address otherwise reads as an unknown token.
     *
     * @return string
     */
    public static function fingerprint()
    {
        return substr(hash_hmac('sha256', 'connection', self::secret()), 0, 16);
    }

    /**
     * A token minted on one site of a network must not reach another.
     *
     * @return string
     */
    public static function prefix()
    {
        return 'extendify_mcp_' . \get_current_blog_id() . '_';
    }
}
