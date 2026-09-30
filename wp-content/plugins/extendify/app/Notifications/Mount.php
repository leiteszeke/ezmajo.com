<?php

namespace Extendify\Notifications;

defined('ABSPATH') || die('No direct access.');

use Extendify\Shared\DataProvider\NotificationData;

/**
 * Admin and front end differ in which slot a hook means, not in what the
 * container for a slot looks like.
 */
class Mount
{
    // phpcs:disable PSR12.Properties.ConstantVisibility.NotFound -- 7.0 floor: no const visibility
    const MEMO_GROUP = 'extendify-notifications';
    // phpcs:enable PSR12.Properties.ConstantVisibility.NotFound

    /**
     * The core admin bar takes a node's markup, not its output.
     *
     * @param string $slot       - One of Slots::ALLOWLIST.
     * @param array  $attributes - Bare attribute names the caller's own surface needs.
     * @return string - Empty when nothing is available to fill the slot.
     */
    public static function container(string $slot, array $attributes = [])
    {
        if (!self::available($slot)) {
            return '';
        }

        return sprintf(
            '<div class="extendify-notifications" data-ext-notification'
                . ' data-slot="%1$s" data-test="notification-%1$s"%2$s></div>',
            \esc_attr($slot),
            $attributes ? ' ' . implode(' ', array_map('esc_attr', $attributes)) : ''
        );
    }

    /**
     * @return bool
     */
    private static function available(string $slot)
    {
        if (!Slots::isKnown($slot)) {
            return false;
        }

        // A persistent cache would carry the answer into requests where the
        // trigger no longer passes.
        \wp_cache_add_non_persistent_groups(self::MEMO_GROUP);

        $memoized = false;
        $memo = \wp_cache_get($slot, self::MEMO_GROUP, false, $memoized);
        if ($memoized) {
            return (bool) $memo;
        }

        // Up to three hooks ask for the same slot in one request.
        $available = Availability::anyIn($slot, NotificationData::get());
        \wp_cache_set($slot, $available, self::MEMO_GROUP);
        return $available;
    }
}
