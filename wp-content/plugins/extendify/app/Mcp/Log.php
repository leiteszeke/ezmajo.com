<?php

/**
 * The tool calls a connection has made on this site.
 */

namespace Extendify\Mcp;

defined('ABSPATH') || die('No direct access.');

/**
 * Arguments are never stored: they carry post bodies, alt text, user filters and
 * email addresses, while a tool name and its outcome answer what support asks.
 * If the shape of a call is ever wanted, store argument keys, never values.
 */
class Log
{
    // phpcs:disable PSR12.Properties.ConstantVisibility.NotFound
    const KEEP_ROWS = 5000;

    const KEEP_DAYS = 90;

    const ERROR_LENGTH = 500;

    const SHOWN = 10;
    // phpcs:enable PSR12.Properties.ConstantVisibility.NotFound

    /**
     * @return string
     */
    public static function table()
    {
        return $GLOBALS['wpdb']->prefix . 'extendify_mcp_log';
    }

    /**
     * @param array  $connection - The connection the call arrived on.
     * @param string $tool       - The tool that was called.
     * @param array  $details    - outcome, error and duration in seconds.
     * @return void
     */
    public static function write(array $connection, $tool, array $details)
    {
        self::install();
        $wpdb = $GLOBALS['wpdb'];
        $wpdb->insert(self::table(), [
            'created_at' => gmdate('Y-m-d H:i:s'),
            'user_id' => (int) ($connection['userId'] ?? \get_current_user_id()),
            'connection' => (string) ($connection['id'] ?? ''),
            'client' => substr((string) ($connection['data']['label'] ?? ''), 0, Connections::LABEL_LENGTH),
            'tool' => substr((string) $tool, 0, Surface::MAX_NAME),
            'outcome' => (string) $details['outcome'],
            'error' => substr((string) ($details['error'] ?? ''), 0, self::ERROR_LENGTH),
            'duration_ms' => (int) round(((float) ($details['duration'] ?? 0)) * 1000),
        ]);

        self::prune();
    }

    /**
     * @param integer $userId     - The user the connection belongs to.
     * @param string  $connection - The connection's id.
     * @param integer $limit      - How many of the newest calls to read.
     * @return array
     */
    public static function recent($userId, $connection, $limit = self::SHOWN)
    {
        if (!self::exists()) {
            return [];
        }

        $wpdb = $GLOBALS['wpdb'];
        $table = self::table();

        return $wpdb->get_results($wpdb->prepare(
            "SELECT created_at, tool, outcome, error FROM {$table}"
                . ' WHERE user_id = %d AND `connection` = %s ORDER BY id DESC LIMIT %d',
            (int) $userId,
            (string) $connection,
            (int) $limit
        ), ARRAY_A) ?: [];
    }

    /**
     * @param integer $userId - The user the connection belonged to.
     * @param string  $id     - The connection's id.
     * @return void
     */
    public static function forget($userId, $id)
    {
        if (!self::exists()) {
            return;
        }

        $GLOBALS['wpdb']->delete(self::table(), [
            'user_id' => (int) $userId,
            'connection' => (string) $id,
        ]);
    }

    /**
     * @return void
     */
    private static function prune()
    {
        $wpdb = $GLOBALS['wpdb'];
        $table = self::table();
        $wpdb->query($wpdb->prepare(
            "DELETE FROM {$table} WHERE created_at < %s",
            gmdate('Y-m-d H:i:s', time() - (self::KEEP_DAYS * DAY_IN_SECONDS))
        ));

        $held = (int) $wpdb->get_var("SELECT COUNT(*) FROM {$table}");
        if ($held <= self::KEEP_ROWS) {
            return;
        }

        $wpdb->query($wpdb->prepare("DELETE FROM {$table} ORDER BY id LIMIT %d", $held - self::KEEP_ROWS));
    }

    /**
     * @return void
     */
    public static function install()
    {
        $wpdb = $GLOBALS['wpdb'];
        $table = self::table();
        if (self::exists()) {
            $held = array_column($wpdb->get_results("SHOW COLUMNS FROM {$table}", ARRAY_A), 'Field');
            foreach (self::columns() as $name => $type) {
                if (!in_array($name, $held, true)) {
                    $wpdb->query("ALTER TABLE {$table} ADD COLUMN `{$name}` {$type}");
                }
            }

            return;
        }

        $columns = [];
        foreach (self::columns() as $name => $type) {
            $columns[] = "`{$name}` {$type}";
        }

        $wpdb->query(
            "CREATE TABLE {$table} (" . implode(',', $columns) . ', INDEX(user_id), INDEX(created_at)) '
                . $wpdb->get_charset_collate() . ';'
        );
    }

    /**
     * @return boolean
     */
    private static function exists()
    {
        $wpdb = $GLOBALS['wpdb'];

        return (bool) $wpdb->get_var($wpdb->prepare('SHOW TABLES LIKE %s', self::table()));
    }

    /**
     * @return array
     */
    private static function columns()
    {
        return [
            'id' => 'BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY',
            'created_at' => 'DATETIME NOT NULL',
            'user_id' => 'BIGINT UNSIGNED NOT NULL',
            'connection' => 'VARCHAR(191) NOT NULL DEFAULT \'\'',
            'client' => 'VARCHAR(' . Connections::LABEL_LENGTH . ') NOT NULL DEFAULT \'\'',
            'tool' => 'VARCHAR(' . Surface::MAX_NAME . ') NOT NULL DEFAULT \'\'',
            'outcome' => 'VARCHAR(16) NOT NULL DEFAULT \'\'',
            'error' => 'VARCHAR(' . self::ERROR_LENGTH . ') NOT NULL DEFAULT \'\'',
            'duration_ms' => 'INT UNSIGNED NOT NULL DEFAULT 0',
        ];
    }
}
