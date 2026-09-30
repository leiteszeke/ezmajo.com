<?php

namespace Extendify\Notifications;

defined('ABSPATH') || die('No direct access.');

/**
 * Availability is site state, so PHP decides it and JS is left with
 * dismissed/viewed.
 */
class Availability
{
    public static function available(array $notifications)
    {
        $candidates = array_filter($notifications, 'is_array');
        $available = array_filter($candidates, [self::class, 'isAvailable']);
        usort($available, [self::class, 'byPriorityThenSlug']);
        return $available;
    }

    public static function anyIn(string $slot, array $notifications)
    {
        foreach (self::available($notifications) as $notification) {
            if (in_array($slot, self::slotsOf($notification), true)) {
                return true;
            }
        }

        return false;
    }

    private static function isAvailable(array $notification)
    {
        return self::hasKnownSlot($notification)
            && Triggers::passes($notification['trigger'] ?? null);
    }

    private static function hasKnownSlot(array $notification)
    {
        foreach (self::slotsOf($notification) as $slot) {
            if (Slots::isKnown($slot)) {
                return true;
            }
        }

        return false;
    }

    private static function slotsOf(array $notification)
    {
        return array_values(array_filter(
            (array) ($notification['slots'] ?? []),
            'is_string'
        ));
    }

    private static function byPriorityThenSlug(array $a, array $b)
    {
        $byPriority = ($b['priority'] ?? 0) <=> ($a['priority'] ?? 0);
        return $byPriority ?: strcmp($a['slug'] ?? '', $b['slug'] ?? '');
    }
}
