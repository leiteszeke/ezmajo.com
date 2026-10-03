<?php

/**
 * Whether connections work on this site at all.
 */

namespace Extendify\Mcp;

defined('ABSPATH') || die('No direct access.');

use Extendify\PartnerData;

/**
 * An administrator can undo their own switch, never the partner's.
 */
class Availability
{
    // phpcs:ignore PSR12.Properties.ConstantVisibility.NotFound
    const OPTION = 'extendify_mcp_turned_off';

    /**
     * @return boolean
     */
    public static function offered()
    {
        // A blocked partner's last mcpConfig would otherwise keep every token working.
        return PartnerData::setting('license') === 'active' && Allowed::reads() !== Allowed::NONE;
    }

    /**
     * @return boolean
     */
    public static function live()
    {
        return self::offered() && !self::turnedOff();
    }

    /**
     * @return array|null
     */
    public static function turnedOff()
    {
        $off = \get_option(self::OPTION);

        return is_array($off) ? $off : null;
    }

    /**
     * @param integer $userId - The administrator turning connections off.
     * @return void
     */
    public static function turnOff($userId)
    {
        \update_option(self::OPTION, ['by' => (int) $userId, 'at' => time()], false);
    }

    /**
     * @return void
     */
    public static function turnOn()
    {
        \delete_option(self::OPTION);
    }
}
