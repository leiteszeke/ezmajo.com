<?php

/**
 * The token a preview hands out, and the check an execution makes of it.
 */

namespace Extendify\Mcp;

defined('ABSPATH') || die('No direct access.');

/**
 * Checking a token spends it, so a second execution and a changed set both
 * send the model back to a preview.
 */
class Confirmation
{
    // phpcs:disable PSR12.Properties.ConstantVisibility.NotFound
    const TTL = 10 * MINUTE_IN_SECONDS;

    const PREFIX = 'extendify_mcp_confirm_';
    // phpcs:enable PSR12.Properties.ConstantVisibility.NotFound

    /**
     * @param string $tool - The tool the preview ran for.
     * @param array  $set  - The ids or slugs the preview reported.
     * @return string
     */
    public static function issue($tool, array $set)
    {
        $token = \wp_generate_password(32, false);
        \set_transient(self::key($token), self::digest($tool, $set), self::TTL);

        return $token;
    }

    /**
     * @param string $tool  - The tool about to execute.
     * @param array  $set   - The ids or slugs it matched now.
     * @param mixed  $token - The confirm_token the call carried.
     * @return string|null - Why the execution may not go ahead, or null when it may.
     */
    public static function refusal($tool, array $set, $token)
    {
        if (!is_string($token) || $token === '') {
            return 'Run with preview first, show the user the list, then pass back the confirm_token it returned.';
        }

        $held = \get_transient(self::key($token));
        \delete_transient(self::key($token));
        if (!is_string($held)) {
            return 'This confirm_token has expired or was already used. Run with preview again.';
        }

        if (!hash_equals($held, self::digest($tool, $set))) {
            return 'What matches has changed since that preview. Run with preview again and show the user the new'
                . ' list.';
        }

        return null;
    }

    /**
     * @param string $tool - The tool the token is for.
     * @param array  $set  - The ids or slugs it covers.
     * @return string
     */
    private static function digest($tool, array $set)
    {
        $set = array_map('strval', $set);
        sort($set);

        return hash('sha256', $tool . '|' . \get_current_user_id() . '|' . implode(',', $set));
    }

    /**
     * @param string $token - The token as the client holds it.
     * @return string
     */
    private static function key($token)
    {
        return self::PREFIX . hash('sha256', $token);
    }
}
