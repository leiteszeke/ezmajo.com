<?php

/**
 * What a connection is allowed to do.
 */

namespace Extendify\Mcp;

defined('ABSPATH') || die('No direct access.');

/**
 * The names a connection row stores.
 */
class Grants
{
    // phpcs:disable PSR12.Properties.ConstantVisibility.NotFound
    const READ = 'read';

    const WRITE = 'write';
    // phpcs:enable PSR12.Properties.ConstantVisibility.NotFound

    /**
     * @return array
     */
    public static function names()
    {
        return [self::READ, self::WRITE];
    }

    /**
     * A row storing no grants could only ever read.
     *
     * @param mixed $grants - Whatever the connection stored.
     * @return array
     */
    public static function sanitize($grants)
    {
        $known = array_values(array_intersect(self::names(), is_array($grants) ? $grants : []));

        return $known ?: [self::READ];
    }

    /**
     * @param string $scope - The space-separated scope an OAuth client asked for.
     * @return array
     */
    public static function fromScope($scope)
    {
        $asked = preg_split('/\s+/', trim((string) $scope));

        return in_array(self::WRITE, $asked, true) ? self::names() : [self::READ];
    }

    /**
     * @param array $grants - The connection's grants.
     * @return string
     */
    public static function label(array $grants)
    {
        return in_array(self::WRITE, $grants, true)
            /* translators: an access level, shown on a badge and on the approval page; a noun phrase, not a command. */
            ? \__('Read and write', 'extendify-local')
            /* translators: an access level, shown on a badge and on the approval page; a noun phrase, not a command. */
            : \__('Read only', 'extendify-local');
    }
}
