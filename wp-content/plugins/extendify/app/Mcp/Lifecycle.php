<?php

/**
 * Revoking connections on account events.
 */

namespace Extendify\Mcp;

defined('ABSPATH') || die('No direct access.');

/**
 * The one account event a tool's own capability check does not already cover.
 */
class Lifecycle
{
    /**
     * @return void
     */
    public static function register()
    {
        \add_action('after_password_reset', [self::class, 'onPasswordReset']);
    }

    /**
     * @param \WP_User $user - The user who reset their password.
     * @return void
     */
    public static function onPasswordReset($user)
    {
        if ($user instanceof \WP_User) {
            Connections::revokeAll($user->ID);
        }
    }
}
